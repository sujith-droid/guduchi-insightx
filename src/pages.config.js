import Dashboard from './pages/Dashboard';
import Reception from './pages/Reception';
import CustomerSupport from './pages/CustomerSupport';
import Pharmacy from './pages/Pharmacy';
import Marketing from './pages/Marketing';
import CenterManager from './pages/CenterManager';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Reception": Reception,
    "CustomerSupport": CustomerSupport,
    "Pharmacy": Pharmacy,
    "Marketing": Marketing,
    "CenterManager": CenterManager,
    "Reports": Reports,
    "Settings": Settings,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};