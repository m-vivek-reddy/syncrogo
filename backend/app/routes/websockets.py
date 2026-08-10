from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List
import json

router = APIRouter(tags=["Live Tracking"])

class ConnectionManager:
    def __init__(self):
        # A dictionary to map a ride_id to a list of connected users
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, ride_id: int):
        await websocket.accept()
        if ride_id not in self.active_connections:
            self.active_connections[ride_id] = []
        self.active_connections[ride_id].append(websocket)

    def disconnect(self, websocket: WebSocket, ride_id: int):
        if ride_id in self.active_connections:
            self.active_connections[ride_id].remove(websocket)
            if not self.active_connections[ride_id]:
                del self.active_connections[ride_id] # Clean up memory when ride ends

    async def broadcast_location(self, message: str, ride_id: int):
        """Sends the GPS data to everyone watching this specific ride."""
        if ride_id in self.active_connections:
            for connection in self.active_connections[ride_id]:
                await connection.send_text(message)

# Instantiate the manager
manager = ConnectionManager()

@router.websocket("/ws/tracking/{ride_id}")
async def tracking_endpoint(websocket: WebSocket, ride_id: int):
    """
    The endpoint where the Flutter app connects. 
    URL format: ws://127.0.0.1:8000/ws/tracking/2
    """
    await manager.connect(websocket, ride_id)
    try:
        while True:
            # The server waits for the driver's phone to send new GPS coordinates
            data = await websocket.receive_text()
            
            # The server instantly broadcasts those coordinates to the customer
            await manager.broadcast_location(data, ride_id)
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, ride_id)