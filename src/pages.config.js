import CenterManager from './pages/CenterManager';
import CustomerSupport from './pages/CustomerSupport';
import Dashboard from './pages/Dashboard';
import Marketing from './pages/Marketing';
import Pharmacy from './pages/Pharmacy';
import Reception from './pages/Reception';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import Help from './pages/Help';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CenterManager": CenterManager,
    "CustomerSupport": CustomerSupport,
    "Dashboard": Dashboard,
    "Marketing": Marketing,
    "Pharmacy": Pharmacy,
    "Reception": Reception,
    "Reports": Reports,
    "Settings": Settings,
    "UserManagement": UserManagement,
    "Help": Help,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};