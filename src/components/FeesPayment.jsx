import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, addDoc, collection, serverTimestamp } from 'firebase/firestore';

const FeesPayment = () => {
  const [paymentData, setPaymentData] = useState({
    name: '',
    year: '',
    branch: '',
    email: '',
    purpose: '',
    feesType: '',
    amount: '',
  });
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const handleInputChange = (e) => {
    setPaymentData({
      ...paymentData,
      [e.target.name]: e.target.value
    });
  };

  const handlePayment = async (method) => {
    try {
      const auth = getAuth();
      const db = getFirestore();
      
      // In a real app, integrate with actual payment gateways
      const paymentRecord = {
        ...paymentData,
        paymentMethod: method,
        timestamp: serverTimestamp(),
        studentId: auth.currentUser.uid,
        status: 'completed'
      };

      const docRef = await addDoc(collection(db, 'payments'), paymentRecord);
      
      setReceiptData({
        ...paymentRecord,
        receiptId: docRef.id,
        date: new Date().toLocaleDateString()
      });
      setShowReceipt(true);
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    }
  };

  return (
    <div className="container mx-auto p-4">
      {!showReceipt ? (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Fees Payment</h2>
          <form className="space-y-4">
            <input
              type="text"
              name="name"
              placeholder="Name"
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              name="year"
              placeholder="Year"
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              name="branch"
              placeholder="Branch"
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
            <input
              type="text"
              name="purpose"
              placeholder="Purpose of Payment"
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />
            <select
              name="feesType"
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            >
              <option value="">Select Fees Type</option>
              <option value="tuition">Tuition Fees</option>
              <option value="hostel">Hostel Fees</option>
              <option value="exam">Exam Fees</option>
            </select>
            <input
              type="number"
              name="amount"
              placeholder="Amount"
              onChange={handleInputChange}
              className="w-full p-2 border rounded"
            />

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => handlePayment('gpay')}
                className="bg-green-500 text-white p-2 rounded flex-1"
              >
                Pay with Google Pay
              </button>
              <button
                type="button"
                onClick={() => handlePayment('phonepe')}
                className="bg-purple-500 text-white p-2 rounded flex-1"
              >
                Pay with PhonePe
              </button>
              <button
                type="button"
                onClick={() => handlePayment('paytm')}
                className="bg-blue-500 text-white p-2 rounded flex-1"
              >
                Pay with Paytm
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-4">Payment Receipt</h2>
          <div className="border p-4 rounded">
            <p><strong>Receipt ID:</strong> {receiptData.receiptId}</p>
            <p><strong>Date:</strong> {receiptData.date}</p>
            <p><strong>Name:</strong> {receiptData.name}</p>
            <p><strong>Amount:</strong> ₹{receiptData.amount}</p>
            <p><strong>Purpose:</strong> {receiptData.purpose}</p>
            <p><strong>Payment Method:</strong> {receiptData.paymentMethod}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="mt-4 bg-gray-500 text-white p-2 rounded"
          >
            Print Receipt
          </button>
        </div>
      )}
    </div>
  );
};

export default FeesPayment;
