import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
const DefaultFallback = () => (_jsx("div", { className: "fixed inset-0 flex items-center justify-center", children: _jsx("div", { className: "w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" }) }));
export default function ProtectedRoute({ fallback = _jsx(DefaultFallback, {}), unauthenticatedElement }) {
    const { isAuthenticated, isLoadingAuth, authChecked, authError, checkUserAuth } = useAuth();
    useEffect(() => {
        if (!authChecked && !isLoadingAuth) {
            checkUserAuth();
        }
    }, [authChecked, isLoadingAuth, checkUserAuth]);
    if (isLoadingAuth || !authChecked) {
        return fallback;
    }
    if (authError) {
        if (authError.type === 'user_not_registered') {
            return _jsx(UserNotRegisteredError, {});
        }
        return unauthenticatedElement;
    }
    if (!isAuthenticated) {
        return unauthenticatedElement;
    }
    return _jsx(Outlet, {});
}
