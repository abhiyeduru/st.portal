import React, { useState, useEffect } from 'react';
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [newStudent, setNewStudent] = useState({
    name: '',
    rollNo: '',
    year: '',
    branch: '',
    email: '',
    password: '',
    totalFees: ''
  });
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFees: 0,
    pendingDues: 0
  });
  const [studentPhoto, setStudentPhoto] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [editingStudent, setEditingStudent] = useState(null);
  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    totalFees: 0,
    pendingDues: 0,
    recentPayments: [],
    todayCollection: 0,
    monthlyCollection: 0
  });
  
  const db = getFirestore();
  const storage = getStorage();
  const auth = getAuth();

  useEffect(() => {
    fetchDashboardStats();
    fetchStudents();
    fetchPayments();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const studentsSnap = await getDocs(collection(db, 'students'));
      const paymentsSnap = await getDocs(collection(db, 'payments'));
      
      let totalStudents = 0;
      let totalFees = 0;
      let pendingDues = 0;
      let todayCollection = 0;
      let monthlyCollection = 0;
      const recentPayments = [];
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      studentsSnap.forEach((doc) => {
        totalStudents++;
        const student = doc.data();
        pendingDues += Number(student.pendingFees || 0);
      });

      paymentsSnap.forEach((doc) => {
        const payment = doc.data();
        const paymentDate = payment.timestamp?.toDate();
        
        if (payment.status === 'verified') {
          totalFees += Number(payment.amount || 0);
          
          if (paymentDate >= today) {
            todayCollection += Number(payment.amount || 0);
          }
          
          if (paymentDate >= firstDayOfMonth) {
            monthlyCollection += Number(payment.amount || 0);
          }
        }

        if (payment.timestamp) {
          recentPayments.push({
            id: doc.id,
            ...payment,
            date: paymentDate
          });
        }
      });

      // Sort recent payments by date and get last 5
      recentPayments.sort((a, b) => b.date - a.date);
      
      setDashboardStats({
        totalStudents,
        totalFees,
        pendingDues,
        recentPayments: recentPayments.slice(0, 5),
        todayCollection,
        monthlyCollection
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const studentsSnap = await getDocs(collection(db, 'students'));
      const studentsData = [];
      studentsSnap.forEach((doc) => {
        studentsData.push({ id: doc.id, ...doc.data() });
      });
      setStudents(studentsData);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      const paymentsSnap = await getDocs(collection(db, 'payments'));
      const paymentsData = [];
      paymentsSnap.forEach((doc) => {
        paymentsData.push({ id: doc.id, ...doc.data() });
      });
      setPayments(paymentsData);
    } catch (error) {
      console.error('Error fetching payments:', error);
    }
  };

  const handleStudentCreate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newStudent.email,
        newStudent.password
      );

      const studentData = {
        uid: userCredential.user.uid,
        ...newStudent,
        createdAt: new Date(),
        status: 'active',
        paidFees: 0,
        pendingFees: Number(newStudent.totalFees)
      };

      await addDoc(collection(db, 'students'), studentData);

      // Create fees record
      await addDoc(collection(db, 'fees'), {
        studentId: userCredential.user.uid,
        totalFees: Number(newStudent.totalFees),
        paidFees: 0,
        pendingFees: Number(newStudent.totalFees),
        lastUpdated: new Date()
      });

      alert(`Student account created successfully!\nEmail: ${newStudent.email}\nPassword: ${newStudent.password}`);
      
      // Reset form and fetch updated data
      setNewStudent({
        name: '', rollNo: '', year: '', branch: '', 
        email: '', password: '', totalFees: ''
      });
      await Promise.all([
        fetchStudents(),
        fetchDashboardStats()
      ]);
      
      // Switch to manage students view
      setActiveTab('manageStudents');
    } catch (error) {
      console.error('Error:', error);
      alert('Error creating student: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditStudent = async (studentId, updatedData) => {
    try {
      await updateDoc(doc(db, 'students', studentId), updatedData);
      setEditingStudent(null);
      fetchStudents();
      alert('Student updated successfully!');
    } catch (error) {
      console.error('Error updating student:', error);
      alert('Error updating student');
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (window.confirm('Are you sure you want to delete this student?')) {
      try {
        await deleteDoc(doc(db, 'students', studentId));
        fetchStudents();
        alert('Student deleted successfully!');
      } catch (error) {
        console.error('Error deleting student:', error);
        alert('Error deleting student');
      }
    }
  };

  const handleCardClick = (type) => {
    switch(type) {
      case 'students':
        setActiveTab('manageStudents');
        break;
      case 'payments':
        setActiveTab('payments');
        break;
      case 'dues':
        setActiveTab('pendingDues');
        break;
      default:
        break;
    }
  };

  const renderCreateStudentForm = () => (
    <div className="min-h-screen bg-white dark:bg-gray-800 p-6">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white">Create New Student</h2>
      <form onSubmit={handleStudentCreate} className="max-w-md mx-auto space-y-4">
        <input
          type="text"
          placeholder="Student Name"
          value={newStudent.name}
          onChange={(e) => setNewStudent({...newStudent, name: e.target.value})}
          className="w-full p-3 border rounded dark:bg-gray-700 dark:text-white"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={newStudent.email}
          onChange={(e) => setNewStudent({...newStudent, email: e.target.value})}
          className="w-full p-3 border rounded dark:bg-gray-700 dark:text-white"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={newStudent.password}
          onChange={(e) => setNewStudent({...newStudent, password: e.target.value})}
          className="w-full p-3 border rounded dark:bg-gray-700 dark:text-white"
          required
        />
        <input
          type="text"
          placeholder="Roll Number"
          value={newStudent.rollNo}
          onChange={(e) => setNewStudent({...newStudent, rollNo: e.target.value})}
          className="w-full p-3 border rounded dark:bg-gray-700 dark:text-white"
          required
        />
        <select
          value={newStudent.year}
          onChange={(e) => setNewStudent({...newStudent, year: e.target.value})}
          className="w-full p-3 border rounded dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="">Select Year</option>
          <option value="1">1st Year</option>
          <option value="2">2nd Year</option>
          <option value="3">3rd Year</option>
          <option value="4">4th Year</option>
        </select>
        <select
          value={newStudent.branch}
          onChange={(e) => setNewStudent({...newStudent, branch: e.target.value})}
          className="w-full p-3 border rounded dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="">Select Branch</option>
          <option value="CSE">Computer Science</option>
          <option value="ECE">Electronics</option>
          <option value="MECH">Mechanical</option>
          <option value="CIVIL">Civil</option>
        </select>
        <input
          type="number"
          placeholder="Total Fees"
          value={newStudent.totalFees}
          onChange={(e) => setNewStudent({...newStudent, totalFees: e.target.value})}
          className="w-full p-3 border rounded dark:bg-gray-700 dark:text-white"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Creating...' : 'Create Student Account'}
        </button>
      </form>
    </div>
  );

  const renderManageStudents = () => (
    <div className="overflow-x-auto">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Manage Students</h2>
        <button
          onClick={() => setActiveTab('createStudent')}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
        >
          + Add New Student
        </button>
      </div>
      <table className="min-w-full bg-white dark:bg-gray-700 shadow-md rounded-lg">
        <thead className="bg-gray-100 dark:bg-gray-600">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Roll No</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Name</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Email</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Year</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Branch</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Total Fees</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Paid</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-200 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-500">
          {students.map((student) => (
            <tr key={student.id} className="hover:bg-gray-50 dark:hover:bg-gray-600">
              <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">{student.rollNo}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">{student.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">{student.email}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">{student.year} Year</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">{student.branch}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">₹{student.totalFees}</td>
              <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-200">₹{student.paidFees || 0}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button
                  onClick={() => handleEditStudent(student)}
                  className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 mr-4"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteStudent(student.id)}
                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => handleCardClick('students')}
          className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-lg shadow-lg cursor-pointer transform hover:scale-105 transition-all"
        >
          <h3 className="text-white text-lg font-semibold">Total Students</h3>
          <p className="text-white text-3xl font-bold">{dashboardStats.totalStudents}</p>
          <p className="text-blue-100 text-sm mt-2">Click to manage students</p>
        </div>

        <div 
          onClick={() => handleCardClick('payments')}
          className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-lg shadow-lg cursor-pointer transform hover:scale-105 transition-all"
        >
          <h3 className="text-white text-lg font-semibold">Total Fees Collected</h3>
          <p className="text-white text-3xl font-bold">₹{dashboardStats.totalFees}</p>
          <p className="text-green-100 text-sm mt-2">Today: ₹{dashboardStats.todayCollection}</p>
        </div>

        <div 
          onClick={() => handleCardClick('dues')}
          className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-6 rounded-lg shadow-lg cursor-pointer transform hover:scale-105 transition-all"
        >
          <h3 className="text-white text-lg font-semibold">Pending Dues</h3>
          <p className="text-white text-3xl font-bold">₹{dashboardStats.pendingDues}</p>
          <p className="text-yellow-100 text-sm mt-2">Click to view details</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold mb-4 dark:text-white">Recent Payments</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
              {dashboardStats.recentPayments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-200">
                    {payment.date.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-200">
                    {payment.studentName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-200">
                    ₹{payment.amount}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      payment.status === 'verified' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-200">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-4">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded ${activeTab === 'dashboard' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setActiveTab('createStudent')}
              className={`px-4 py-2 rounded ${activeTab === 'createStudent' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Create Student
            </button>
            <button 
              onClick={() => setActiveTab('manageStudents')}
              className={`px-4 py-2 rounded ${activeTab === 'manageStudents' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              Manage Students
            </button>
            <button 
              onClick={() => setActiveTab('payments')}
              className={`px-4 py-2 rounded ${activeTab === 'payments' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            >
              View Payments
            </button>
          </div>
          <button
            onClick={() => document.documentElement.classList.toggle('dark')}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
          >
            🌓
          </button>
        </div>

        {activeTab === 'createStudent' ? (
          renderCreateStudentForm()
        ) : (
          <>
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'manageStudents' && renderManageStudents()}
            {activeTab === 'payments' && (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Student</th>
                      <th>Amount</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment) => (
                      <tr key={payment.id}>
                        <td>{payment.timestamp?.toDate().toLocaleDateString()}</td>
                        <td>{payment.studentName}</td>
                        <td>₹{payment.amount}</td>
                        <td>{payment.feesType}</td>
                        <td>{payment.status}</td>
                        <td>
                          <button onClick={() => handleVerifyPayment(payment.id)}>
                            Verify
                          </button>
                          <button onClick={() => handleViewPaymentDetails(payment)}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
