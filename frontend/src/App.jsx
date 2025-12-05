import { Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import { ToastContainer } from 'react-toastify';

const App = () => {
  return (
    <div className="min-h-screen text-slate-100">
      <Navbar />
      <Outlet />
      <ToastContainer position="top-right" theme="colored" closeOnClick newestOnTop pauseOnHover={false} />
    </div>
  );
};

export default App;
