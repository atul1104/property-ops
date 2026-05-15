import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/slices/authSlice';
import { Building2, MessageSquare, Ticket, LayoutDashboard, ShieldCheck, LogOut } from 'lucide-react';

const navLinks = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['TENANT', 'ADMIN'] },
  { to: '/tickets', label: 'Tickets', icon: Ticket, roles: ['TENANT', 'ADMIN'] },
  { to: '/chat', label: 'Lease Chat', icon: MessageSquare, roles: ['TENANT', 'ADMIN'] },
  { to: '/admin', label: 'Admin', icon: ShieldCheck, roles: ['ADMIN'] },
];

const getInitials = (email) => {
  if (!email) return '?';
  const [local] = email.split('@');
  const parts = local.split(/[._-]/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : local.slice(0, 2).toUpperCase();
};

export default function Navbar() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { role, email } = useSelector((s) => s.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center gap-2 font-bold text-brand-700 text-lg">
            <Building2 size={22} />
            <span className="hidden sm:inline">Property Ops AI</span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-1">
            {navLinks
              .filter((l) => l.roles.includes(role))
              .map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    location.pathname === to
                      ? 'bg-brand-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden md:inline">{label}</span>
                </Link>
              ))}
          </div>

          {/* User + logout */}
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm"
              title={email}
            >
              {getInitials(email)}
            </div>
            <span
              className={`badge text-xs ${
                role === 'ADMIN' ? 'bg-brand-100 text-brand-700' : 'bg-green-100 text-green-700'
              }`}
            >
              {role}
            </span>
            <button
              onClick={handleLogout}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all hover:scale-110"
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
