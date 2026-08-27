import { API_BASE_URL } from '../api/config';

interface PaymentButtonProps {
  rideId: number;
  bookingId: number;
  finalFare: number;
  passengerEmail: string;
  onPaid?: (paymentId: number) => void;
}

export function PaymentButton({ rideId, bookingId, finalFare, passengerEmail, onPaid }: PaymentButtonProps) {
  const loadRazorpayScript = () => {
    return new Promise<boolean>((resolve) => {
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    const orderResponse = await fetch(`${API_BASE_URL}/payments/create-order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('syncrogo_token') ?? ''}`,
      },
      body: JSON.stringify({ booking_id: bookingId }),
    });
    const order = await orderResponse.json();
    if (!orderResponse.ok) {
      alert(order.detail || 'Payment is not available for this trip.');
      return;
    }

    const res = await loadRazorpayScript();
    if (!res) {
      alert('Razorpay SDK failed to load. Check your internet connection.');
      return;
    }

    const options = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency,
      name: 'SyncroGo Ride Payment',
      description: `Payment after completion of Ride #${rideId}`,
      order_id: order.order_id,
      handler: async function (response: any) {
        try {
          const verifyRes = await fetch(`${API_BASE_URL}/payments/verify-payment`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('syncrogo_token') ?? ''}`,
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_id: bookingId,
              idempotency_key: response.razorpay_payment_id,
            }),
          });

          const result = await verifyRes.json();
          if (verifyRes.ok) {
            alert('Payment successful! Driver wallet updated.');
            onPaid?.(result.payment_id);
          } else {
            alert(result.detail || 'Payment verification failed.');
          }
        } catch (err) {
          console.error('Verification error:', err);
          alert('Payment verification error. Please try again.');
        }
      },
      prefill: {
        email: passengerEmail,
      },
      theme: {
        color: '#4F46E5',
      },
    };

    const paymentObject = new (window as any).Razorpay(options);
    paymentObject.open();
  };

  return (
    <button
      onClick={handlePayment}
      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl shadow-md transition duration-200"
    >
      Pay ₹{finalFare} Now
    </button>
  );
}
