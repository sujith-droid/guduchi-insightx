import Dashboard from './pages/Dashboard';
import Reception from './pages/Reception';
import CustomerSupport from './pages/CustomerSupport';
import Pharmacy from './pages/Pharmacy';
import Marketing from './pages/Marketing';
import CenterManager from './pages/CenterManager';
import Reports from './pages/Reports';


export const PAGES = {
    "Dashboard": Dashboard,
    "Reception": Reception,
    "CustomerSupport": CustomerSupport,
    "Pharmacy": Pharmacy,
    "Marketing": Marketing,
    "CenterManager": CenterManager,
    "Reports": Reports,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
};