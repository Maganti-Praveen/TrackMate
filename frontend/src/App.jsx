import { Outlet } from 'react-router-dom';
import Navbar from './components/Navbar';
import { Toaster } from 'react-hot-toast';


const App = () => {
  return (
    <div className="min-h-screen text-slate-100">
      <Navbar />
      <Outlet />
      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
};

export default App;
