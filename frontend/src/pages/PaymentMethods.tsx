import { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import ProfileBackButton from "../components/profile/ProfileBackButton";

interface PaymentCard {
  id: number;
  card_brand: string;
  last_4: string;
  expiry_month: number;
  expiry_year: number;
  is_default: boolean;
}

export default function PaymentMethods() {
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newCard, setNewCard] = useState({ card_brand: 'Visa', last_4: '', expiry_month: '', expiry_year: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await apiClient.get('/api/v1/payments/methods');
      setCards(res.data);
    } catch (err) {
      console.error('Failed to fetch payment methods', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');

    try {
      const res = await apiClient.post('/api/v1/payments/methods', {
        card_brand: newCard.card_brand,
        last_4: newCard.last_4,
        expiry_month: parseInt(newCard.expiry_month, 10),
        expiry_year: parseInt(newCard.expiry_year, 10),
      });

      if (res.status === 201) {
        setMessage('Card added successfully!');
        setNewCard({ card_brand: 'Visa', last_4: '', expiry_month: '', expiry_year: '' });
        setShowForm(false);
        fetchCards();
      } else {
        setMessage('Failed to add card.');
      }
    } catch (error) {
      setMessage('An error occurred.');
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-600">Loading payment methods...</div>;

  return (
    <div className="p-6 max-w-md mx-auto bg-slate-50 min-h-screen">
      <ProfileBackButton />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-slate-800">Payment Methods</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-sm bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition"
        >
          {showForm ? 'Cancel' : '+ Add Card'}
        </button>
      </div>

      {message && <p className="text-sm p-2 mb-4 rounded bg-slate-200 text-slate-700">{message}</p>}

      {showForm && (
        <form onSubmit={handleAddCard} className="bg-white p-4 rounded-xl shadow-md space-y-3 mb-6">
          <h3 className="font-semibold text-slate-700 text-sm">Add New Card</h3>
          <div>
            <label className="block text-xs text-slate-500">Brand</label>
            <select
              value={newCard.card_brand}
              onChange={(e) => setNewCard({ ...newCard, card_brand: e.target.value })}
              className="w-full border p-2 rounded-md text-sm"
            >
              <option value="Visa">Visa</option>
              <option value="MasterCard">MasterCard</option>
              <option value="Amex">American Express</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500">Last 4 Digits</label>
            <input
              type="text"
              maxLength={4}
              value={newCard.last_4}
              onChange={(e) => setNewCard({ ...newCard, last_4: e.target.value })}
              className="w-full border p-2 rounded-md text-sm"
              required
            />
          </div>
          <div className="flex space-x-2">
            <div className="w-1/2">
              <label className="block text-xs text-slate-500">Month</label>
              <input
                type="number"
                placeholder="MM"
                min={1}
                max={12}
                value={newCard.expiry_month}
                onChange={(e) => setNewCard({ ...newCard, expiry_month: e.target.value })}
                className="w-full border p-2 rounded-md text-sm"
                required
              />
            </div>
            <div className="w-1/2">
              <label className="block text-xs text-slate-500">Year</label>
              <input
                type="number"
                placeholder="YY"
                value={newCard.expiry_year}
                onChange={(e) => setNewCard({ ...newCard, expiry_year: e.target.value })}
                className="w-full border p-2 rounded-md text-sm"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded-md text-sm font-medium hover:bg-blue-700 transition"
          >
            Save Card
          </button>
        </form>
      )}

      <div className="space-y-3">
        {cards.length === 0 ? (
          <p className="text-slate-500 text-sm text-center py-4">No payment methods saved yet.</p>
        ) : (
          cards.map((card) => (
            <div key={card.id} className="bg-white p-4 rounded-xl shadow-sm flex justify-between items-center border border-slate-100">
              <div>
                <p className="font-semibold text-slate-800">{card.card_brand} •••• {card.last_4}</p>
                <p className="text-xs text-slate-500">Expires {card.expiry_month}/{card.expiry_year}</p>
              </div>
              {card.is_default && <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Default</span>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
