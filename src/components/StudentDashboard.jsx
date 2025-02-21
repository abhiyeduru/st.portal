import React, { useEffect, useState } from 'react';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const StudentDashboard = () => {
  const [studentData, setStudentData] = useState(null);
  const [feesDue, setFeesDue] = useState(0);
  const auth = getAuth();
  const db = getFirestore();

  useEffect(() => {
    const fetchStudentData = async () => {
      const studentDoc = await getDoc(doc(db, 'students', auth.currentUser.uid));
      if (studentDoc.exists()) {
        setStudentData(studentDoc.data());
      }
    };

    const fetchFeesDue = async () => {
      const feesDoc = await getDoc(doc(db, 'fees', auth.currentUser.uid));
      if (feesDoc.exists()) {
        setFeesDue(feesDoc.data().totalDue || 0);
      }
    };

    fetchStudentData();
    fetchFeesDue();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-800 transition-colors duration-200">
      <div className="container mx-auto p-4">
        {studentData && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Profile Section */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  {studentData.name}
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  Roll No: {studentData.rollNo}
                </p>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-gray-50 dark:bg-gray-600 p-3 rounded">
                    <p className="font-semibold dark:text-white">Year</p>
                    <p className="dark:text-gray-300">{studentData.year}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-600 p-3 rounded">
                    <p className="font-semibold dark:text-white">Branch</p>
                    <p className="dark:text-gray-300">{studentData.branch}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Fees Section */}
            <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                Fees Status
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded">
                  <h4 className="font-semibold text-blue-800 dark:text-blue-200">
                    Total Fees
                  </h4>
                  <p className="text-2xl">₹{studentData.totalFees}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900 p-4 rounded">
                  <h4 className="font-semibold text-green-800 dark:text-green-200">
                    Paid Fees
                  </h4>
                  <p className="text-2xl">₹{studentData.paidFees || 0}</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded">
                  <h4 className="font-semibold text-yellow-800 dark:text-yellow-200">
                    Pending Dues
                  </h4>
                  <p className="text-2xl">₹{studentData.pendingFees}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentDashboard;
