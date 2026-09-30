import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
const db = globalThis.__SMART_PRODUCAO_DB__;
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    const [authChecked, setAuthChecked] = useState(false);
    const [authError, setAuthError] = useState(null);
    const checkUserAuth = useCallback(async () => {
        setIsLoadingAuth(true);
        setAuthError(null);
        try {
            const current = await db.auth.me();
            setUser(current);
            setIsAuthenticated(true);
        }
        catch (error) {
            setUser(null);
            setIsAuthenticated(false);
            setAuthError({
                type: error?.code === 'user_not_registered' ? 'user_not_registered' : 'auth_required',
                message: error?.message || 'Acesso não autorizado',
            });
        }
        finally {
            setIsLoadingAuth(false);
            setAuthChecked(true);
        }
    }, []);
    useEffect(() => { checkUserAuth(); }, [checkUserAuth]);
    const logout = useCallback(async (shouldRedirect = true) => {
        await db.auth.logout();
        setUser(null);
        setIsAuthenticated(false);
        if (shouldRedirect)
            db.auth.redirectToLogin();
    }, []);
    const navigateToLogin = useCallback(() => db.auth.redirectToLogin(), []);
    return _jsx(AuthContext.Provider, { value: {
            user,
            isAuthenticated,
            isLoadingAuth,
            isLoadingPublicSettings: false,
            authError,
            appPublicSettings: null,
            authChecked,
            logout,
            navigateToLogin,
            checkUserAuth,
            checkAppState: checkUserAuth,
        }, children: children });
}
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context)
        throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
