import CenterManager from './pages/CenterManager';
import CustomerSupport from './pages/CustomerSupport';
import Dashboard from './pages/Dashboard';
import Help from './pages/Help';
import Marketing from './pages/Marketing';
import Pharmacy from './pages/Pharmacy';
import Reception from './pages/Reception';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import OnlineConsultation from './pages/OnlineConsultation';
import __Layout from './Layout.jsx';


export const PAGES = {
    "CenterManager": CenterManager,
    "CustomerSupport": CustomerSupport,
    "Dashboard": Dashboard,
    "Help": Help,
    "Marketing": Marketing,
    "Pharmacy": Pharmacy,
    "Reception": Reception,
    "UserManagement": UserManagement,
    "Settings": Settings,
    "Reports": Reports,
    "OnlineConsultation": OnlineConsultation,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};