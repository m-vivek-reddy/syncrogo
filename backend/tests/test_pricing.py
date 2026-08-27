import unittest
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.api.pricing import calculate_fare, get_platform_fee
from app.schemas.pricing import PriceCalculationRequest
from app.services.pricing_service import calculate_ride_fare, validate_and_update_ride_price
from app.models.ride import Ride


class TestPricingEngine(unittest.TestCase):
    def test_bike_pricing_short_distance(self):
        req = PriceCalculationRequest(distance_km=5.0, duration_minutes=15.0, ride_type="bike")
        res = calculate_fare(req)
        # distance_fare = 5 * 5.0 = 25.0, platform_fee = 3.0, total = 28.0
        self.assertEqual(res["distance_fare"], 25.0)
        self.assertEqual(res["platform_fee"], 3.0)
        self.assertEqual(res["total_fare"], 28.0)

    def test_carpool_pricing_medium_distance(self):
        req = PriceCalculationRequest(distance_km=20.0, duration_minutes=40.0, ride_type="carpool")
        res = calculate_fare(req)
        # distance_fare = 20 * 10.0 = 200.0, platform_fee = 10.0, total = 210.0
        self.assertEqual(res["distance_fare"], 200.0)
        self.assertEqual(res["platform_fee"], 10.0)
        self.assertEqual(res["total_fare"], 210.0)

    def test_minimum_fare_enforced(self):
        req = PriceCalculationRequest(distance_km=0.5, duration_minutes=2.0, ride_type="bike")
        res = calculate_fare(req)
        # distance = 2.5, platform_fee = 3.0 -> sum 5.5 < min fare 8.0 -> total 8.0
        self.assertEqual(res["total_fare"], 8.0)

    def test_calculate_ride_fare_no_base_price_bike(self):
        # 10 km bike: 10 * 5.0 = 50.0 distance fare, 5.0 platform fee, base_fare = 0.0 -> total MRP = 55.0
        pricing = calculate_ride_fare(distance_km=10.0, vehicle_type="bike")
        self.assertEqual(pricing["base_fare"], 0.0)
        self.assertEqual(pricing["per_km_rate"], 5.0)
        self.assertEqual(pricing["platform_fee"], 5.0)
        self.assertEqual(pricing["mrp_fare"], 55.0)
        self.assertEqual(pricing["final_fare"], 55.0)

    def test_calculate_ride_fare_no_base_price_car(self):
        # 10 km car: 10 * 8.0 = 80.0 distance fare, 8.0 platform fee, base_fare = 0.0 -> total MRP = 88.0
        pricing = calculate_ride_fare(distance_km=10.0, vehicle_type="car")
        self.assertEqual(pricing["base_fare"], 0.0)
        self.assertEqual(pricing["per_km_rate"], 8.0)
        self.assertEqual(pricing["platform_fee"], 8.0)
        self.assertEqual(pricing["mrp_fare"], 88.0)
        self.assertEqual(pricing["final_fare"], 88.0)


if __name__ == "__main__":
    unittest.main()
