interface PaymentButtonProps {
  rideId: number;
  driverId: number;
  finalFare: number;
  passengerEmail: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';

export function PaymentButton({ rideId, driverId, finalFare, passengerEmail }: PaymentButtonProps) {
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
    const res = await loadRazorpayScript();
    if (!res) {
      alert('Razorpay SDK failed to load. Check your internet connection.');
      return;
    }

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID ?? 'YOUR_RAZORPAY_KEY_ID',
      amount: Math.round(finalFare * 100),
      currency: 'INR',
      name: 'SyncroGo Ride Payment',
      description: `Payment for Ride #${rideId}`,
      handler: async function (response: any) {
        try {
          const verifyRes = await fetch(`${API_BASE_URL}/payments/verify-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id || 'ord_mock',
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              ride_id: rideId,
              driver_id: driverId,
            }),
          });

          const result = await verifyRes.json();
          if (verifyRes.ok) {
            alert('Payment successful! Driver wallet updated.');
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
