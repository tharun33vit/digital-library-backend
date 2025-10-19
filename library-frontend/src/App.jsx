import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// --- Configuration ---
// This is the address of your Django backend.
const API_BASE_URL = 'http://127.0.0.1:8000/api';

// --- API Service Setup ---
// Create a dedicated axios instance for our API calls
const api = axios.create({
    baseURL: API_BASE_URL,
});

// This is a "magic" interceptor. It automatically attaches the authentication token
// to every single request you make, so you don't have to do it manually.
api.interceptors.request.use(
    config => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    error => Promise.reject(error)
);


// --- Main App Component ---
// This component manages the overall state and which page is currently visible.
export default function App() {
    // This state keeps track of whether a user is logged in and what their role is.
    const [auth, setAuth] = useState({
        token: localStorage.getItem('access_token'),
        role: localStorage.getItem('user_role'),
        isAuthenticated: !!localStorage.getItem('access_token'),
    });
    // This state acts as a simple router to decide which page to show.
    const [view, setView] = useState('roleSelect'); 

    // This effect runs once when the app first loads.
    // It checks if the user was already logged in from a previous session.
    useEffect(() => {
        const token = localStorage.getItem('access_token');
        const role = localStorage.getItem('user_role');
        if (token && role) {
            setAuth({ token, role, isAuthenticated: true });
            setView(role === 'admin' ? 'adminDashboard' : 'userDashboard');
        }
    }, []);

    // This function is called when a user successfully logs in.
    const handleLogin = (token, decodedToken) => {
        localStorage.setItem('access_token', token);
        localStorage.setItem('user_role', decodedToken.role);
        setAuth({ token, role: decodedToken.role, isAuthenticated: true });
        setView(decodedToken.role === 'admin' ? 'adminDashboard' : 'userDashboard');
    };

    // This function is called when a user logs out.
    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_role');
        setAuth({ token: null, role: null, isAuthenticated: false });
        setView('roleSelect');
    };
    
    // This function determines which page component to render based on the 'view' state.
    const renderView = () => {
        switch (view) {
            case 'login':
                return <LoginPage onLogin={handleLogin} setView={setView} />;
            case 'userDashboard':
                return <UserDashboard onLogout={handleLogout} />;
            case 'adminDashboard':
                return <AdminDashboard onLogout={handleLogout} />;
            case 'roleSelect':
            default:
                return <RoleSelectPage setView={setView} />;
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen font-sans">
            <div className="container mx-auto p-4 md:p-8">
                {renderView()}
            </div>
        </div>
    );
}

// --- Pages and Components ---

// The first page the user sees.
function RoleSelectPage({ setView }) {
    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="text-center bg-white p-12 rounded-2xl shadow-xl max-w-md w-full">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">Digital Library</h1>
                <p className="text-gray-600 mb-8">Please select your role to continue.</p>
                <div className="space-y-4">
                    <button
                        onClick={() => setView('login')}
                        className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-105"
                    >
                        I am a User
                    </button>
                    <button
                        onClick={() => setView('login')}
                        className="w-full bg-gray-700 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-800 transition-all duration-300 transform hover:scale-105"
                    >
                        I am an Admin
                    </button>
                </div>
            </div>
        </div>
    );
}

// The login page for both users and admins.
function LoginPage({ onLogin, setView }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await api.post('/token/', { email, password });
            const token = response.data.access;
            
            // This is a simple way to decode the JWT to get the user's role.
            const decoded = JSON.parse(atob(token.split('.')[1]));

            onLogin(token, decoded);
        } catch (err) {
            setError('Invalid email or password. Please try again.');
            console.error(err);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <div className="text-center bg-white p-12 rounded-2xl shadow-xl max-w-md w-full">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome Back!</h1>
                <p className="text-gray-500 mb-8">Log in to access the library.</p>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                    />
                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all duration-300"
                    >
                        Login
                    </button>
                </form>
                <button onClick={() => setView('roleSelect')} className="mt-6 text-blue-600 hover:underline">
                    &larr; Back to role selection
                </button>
            </div>
        </div>
    );
}

// --- User Dashboard ---
function UserDashboard({ onLogout }) {
    const [books, setBooks] = useState([]);
    const [myBorrows, setMyBorrows] = useState([]);
    const [message, setMessage] = useState('');

    const fetchBooks = useCallback(async () => {
        try {
            const response = await api.get('/books/');
            setBooks(response.data);
        } catch (error) {
            console.error("Error fetching books:", error);
        }
    }, []);

    const fetchMyBorrows = useCallback(async () => {
        try {
            const response = await api.get('/borrows/');
            setMyBorrows(response.data);
        } catch (error) {
            console.error("Error fetching borrows:", error);
        }
    }, []);

    useEffect(() => {
        fetchBooks();
        fetchMyBorrows();
    }, [fetchBooks, fetchMyBorrows]);

    const handleBorrow = async (bookId) => {
        setMessage('');
        try {
            await api.post('/borrows/', { book: bookId });
            setMessage('Book borrowed successfully!');
            fetchBooks();
            fetchMyBorrows();
        } catch (error) {
            setMessage('Failed to borrow book. It may be unavailable.');
            console.error("Error borrowing book:", error);
        }
        setTimeout(() => setMessage(''), 3000);
    };

    const handleReturn = async (borrowId) => {
        setMessage('');
        try {
            await api.post(`/borrows/${borrowId}/return_book/`);
            setMessage('Book returned successfully!');
            fetchBooks();
            fetchMyBorrows();
        } catch (error) {
            setMessage('Failed to return book.');
            console.error("Error returning book:", error);
        }
        setTimeout(() => setMessage(''), 3000);
    };

    return (
        <div>
            <Navbar onLogout={onLogout} role="User" />
            {message && <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-6 text-center">{message}</div>}
            
            <div className="mb-12">
                <h2 className="text-3xl font-bold text-gray-800 mb-6">My Borrowed Books</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {myBorrows.filter(b => !b.actual_return_date).length > 0 ? (
                        myBorrows.filter(b => !b.actual_return_date).map(borrow => (
                            <MyBorrowCard key={borrow.id} borrow={borrow} onReturn={handleReturn} />
                        ))
                    ) : (
                        <p className="text-gray-500 col-span-full">You have no active borrows.</p>
                    )}
                </div>
            </div>

            <div>
                <h2 className="text-3xl font-bold text-gray-800 mb-6">Available Books</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {books.map(book => (
                        <BookCard key={book.id} book={book} onBorrow={handleBorrow} />
                    ))}
                </div>
            </div>
        </div>
    );
}

// --- Admin Dashboard ---
function AdminDashboard({ onLogout }) {
    const [view, setView] = useState('books'); // books, users, borrows
    const [books, setBooks] = useState([]);
    const [users, setUsers] = useState([]);
    const [borrows, setBorrows] = useState([]);

    const fetchData = useCallback(async () => {
        try {
            const [booksRes, usersRes, borrowsRes] = await Promise.all([
                api.get('/books/'),
                api.get('/users/'),
                api.get('/borrows/')
            ]);
            setBooks(booksRes.data);
            setUsers(usersRes.data);
            setBorrows(borrowsRes.data);
        } catch (error) {
            console.error("Error fetching admin data:", error);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const [showRegisterUser, setShowRegisterUser] = useState(false);
    const [showUploadBook, setShowUploadBook] = useState(false);
    
    return (
        <div>
            <Navbar onLogout={onLogout} role="Admin" />
            
            <div className="bg-white p-6 rounded-2xl shadow-lg mb-8">
                 <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex space-x-2">
                        <AdminNavButton text="Manage Books" active={view === 'books'} onClick={() => setView('books')} />
                        <AdminNavButton text="Manage Users" active={view === 'users'} onClick={() => setView('users')} />
                        <AdminNavButton text="Borrow Records" active={view === 'borrows'} onClick={() => setView('borrows')} />
                    </div>
                    <div className="flex space-x-2">
                        <button onClick={() => setShowUploadBook(true)} className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 transition">Upload Book</button>
                        <button onClick={() => setShowRegisterUser(true)} className="bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 transition">Register User</button>
                    </div>
                </div>
            </div>

            {view === 'books' && <BookManagementTable books={books} />}
            {view === 'users' && <UserManagementTable users={users} borrows={borrows} />}
            {view === 'borrows' && <BorrowRecordsTable borrows={borrows} />}

            {showRegisterUser && <RegisterUserModal onClose={() => setShowRegisterUser(false)} onUserRegistered={fetchData} />}
            {showUploadBook && <UploadBookModal onClose={() => setShowUploadBook(false)} onBookUploaded={fetchData} />}
        </div>
    );
}

// --- Reusable UI Components ---

function Navbar({ onLogout, role }) {
    return (
        <header className="bg-white p-4 rounded-2xl shadow-lg mb-8 flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-600">{role} Dashboard</h1>
            <button onClick={onLogout} className="bg-red-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-red-600 transition">Logout</button>
        </header>
    );
}

function AdminNavButton({ text, active, onClick }) {
    return (
        <button
            onClick={onClick}
            className={`font-semibold py-2 px-4 rounded-lg transition ${
                active ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
        >
            {text}
        </button>
    );
}


function BookCard({ book, onBorrow }) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-md flex flex-col justify-between">
            <div>
                <h3 className="font-bold text-xl text-gray-800 mb-2">{book.title}</h3>
                <p className="text-gray-500 mb-4">by {book.author}</p>
            </div>
            <div className="flex justify-between items-center">
                 <a href={`${API_BASE_URL.replace('/api', '')}${book.pdf}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View PDF</a>
                 {book.available ? (
                    <button onClick={() => onBorrow(book.id)} className="bg-green-500 text-white font-semibold py-1 px-3 rounded-md hover:bg-green-600 text-sm">Borrow</button>
                 ) : (
                    <span className="text-sm font-semibold text-red-500">Unavailable</span>
                 )}
            </div>
        </div>
    );
}

function MyBorrowCard({ borrow, onReturn }) {
    const isOverdue = new Date(borrow.due_date) < new Date() && !borrow.actual_return_date;
    return (
        <div className={`p-6 rounded-2xl shadow-md border-l-4 ${isOverdue ? 'border-red-500 bg-red-50' : 'border-blue-500 bg-white'}`}>
            <h3 className="font-bold text-xl text-gray-800 mb-2">{borrow.book_title}</h3>
            <p className="text-gray-600 text-sm">Borrowed: {borrow.borrow_date}</p>
            <p className={`text-sm font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>Due: {borrow.due_date}</p>
            {borrow.fine > 0 && <p className="font-bold text-yellow-600 mt-2">Fine: ₹{borrow.fine}</p>}
            <button onClick={() => onReturn(borrow.id)} className="mt-4 w-full bg-gray-700 text-white font-semibold py-2 px-3 rounded-lg hover:bg-gray-800">Return Book</button>
        </div>
    );
}


// --- Admin Management Tables and Modals ---

function BookManagementTable({ books }) {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-2xl font-bold mb-4">All Books</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="p-3">Title</th>
                            <th className="p-3">Author</th>
                            <th className="p-3">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {books.map(book => (
                            <tr key={book.id} className="border-b">
                                <td className="p-3">{book.title}</td>
                                <td className="p-3">{book.author}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${book.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {book.available ? 'Available' : 'Borrowed'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function UserManagementTable({ users, borrows }) {
    const getUserFines = (userId) => {
        return borrows
            .filter(b => b.user === userId && b.fine > 0)
            .reduce((total, b) => total + b.fine, 0);
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-2xl font-bold mb-4">All Users</h3>
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-3">Username</th>
                        <th className="p-3">Email</th>
                        <th className="p-3">Role</th>
                        <th className="p-3">Total Fines</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id} className="border-b">
                            <td className="p-3">{user.username}</td>
                            <td className="p-3">{user.email}</td>
                            <td className="p-3">{user.role}</td>
                            <td className="p-3 font-semibold text-red-600">₹{getUserFines(user.id)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function BorrowRecordsTable({ borrows }) {
     const isOverdue = (borrow) => new Date(borrow.due_date) < new Date() && !borrow.actual_return_date;
    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h3 className="text-2xl font-bold mb-4">All Borrow Records</h3>
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="p-3">Book Title</th>
                        <th className="p-3">User Email</th>
                        <th className="p-3">Due Date</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Fine</th>
                    </tr>
                </thead>
                <tbody>
                    {borrows.map(borrow => (
                        <tr key={borrow.id} className="border-b">
                            <td className="p-3">{borrow.book_title}</td>
                            <td className="p-3">{borrow.user_email}</td>
                            <td className="p-3">{borrow.due_date}</td>
                            <td className="p-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                    borrow.actual_return_date ? 'bg-gray-200 text-gray-800' 
                                    : isOverdue(borrow) ? 'bg-red-100 text-red-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                    {borrow.actual_return_date ? 'Returned' : isOverdue(borrow) ? 'Overdue' : 'Borrowed'}
                                </span>
                            </td>
                            <td className="p-3 font-semibold text-red-600">₹{borrow.fine}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// --- Modal for Registering a New User ---
function RegisterUserModal({ onClose, onUserRegistered }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            await api.post('/users/', { username, email, password, role: 'user' });
            onUserRegistered();
            onClose();
        } catch (err) {
            setError('Failed to register user. Email or username may already exist.');
            console.error(err);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold mb-6">Register New User</h2>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                     <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" required className="w-full px-4 py-2 border rounded-lg" />
                     <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" required className="w-full px-4 py-2 border rounded-lg" />
                     <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" required className="w-full px-4 py-2 border rounded-lg" />
                     <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-green-600 text-white font-semibold py-2 px-6 rounded-lg">Register</button>
                     </div>
                </form>
            </div>
        </div>
    );
}

// --- Modal for Uploading a New Book ---
function UploadBookModal({ onClose, onBookUploaded }) {
    const [title, setTitle] = useState('');
    const [author, setAuthor] = useState('');
    const [pdf, setPdf] = useState(null);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const formData = new FormData();
        formData.append('title', title);
        formData.append('author', author);
        formData.append('pdf', pdf);

        try {
            // We need to send form-data for file uploads
            await api.post('/books/', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onBookUploaded();
            onClose();
        } catch (err) {
            setError('Failed to upload book.');
            console.error(err);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                <h2 className="text-2xl font-bold mb-6">Upload New Book</h2>
                {error && <p className="bg-red-100 text-red-700 p-3 rounded-lg mb-4">{error}</p>}
                <form onSubmit={handleSubmit} className="space-y-4">
                     <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Book Title" required className="w-full px-4 py-2 border rounded-lg" />
                     <input type="text" value={author} onChange={e => setAuthor(e.target.value)} placeholder="Author" required className="w-full px-4 py-2 border rounded-lg" />
                     <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Book PDF</label>
                        <input type="file" onChange={e => setPdf(e.target.files[0])} required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                     </div>
                     <div className="flex justify-end space-x-4 pt-4">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-semibold py-2 px-6 rounded-lg">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg">Upload</button>
                     </div>
                </form>
            </div>
        </div>
    );
}

