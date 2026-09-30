import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const db = globalThis.__SMART_PRODUCAO_DB__ || { auth: { isAuthenticated: async () => false, me: async () => null }, entities: new Proxy({}, { get: () => ({ filter: async () => [], get: async () => null, create: async () => ({}), update: async () => ({}), delete: async () => ({}) }) }), integrations: { Core: { UploadFile: async () => ({ file_url: '' }) } } };
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
export default function PageNotFound({}) {
    const location = useLocation();
    const pageName = location.pathname.substring(1);
    const { data: authData, isFetched } = useQuery({
        queryKey: ['user'],
        queryFn: async () => {
            try {
                const user = await db.auth.me();
                return { user, isAuthenticated: true };
            }
            catch (error) {
                return { user: null, isAuthenticated: false };
            }
        }
    });
    return (_jsx("div", { className: "min-h-screen flex items-center justify-center p-6 bg-slate-50", children: _jsx("div", { className: "max-w-md w-full", children: _jsxs("div", { className: "text-center space-y-6", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("h1", { className: "text-7xl font-light text-slate-300", children: "404" }), _jsx("div", { className: "h-0.5 w-16 bg-slate-200 mx-auto" })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("h2", { className: "text-2xl font-medium text-slate-800", children: "Page Not Found" }), _jsxs("p", { className: "text-slate-600 leading-relaxed", children: ["The page ", _jsxs("span", { className: "font-medium text-slate-700", children: ["\"", pageName, "\""] }), " could not be found in this application."] })] }), isFetched && authData.isAuthenticated && authData.user?.role === 'admin' && (_jsx("div", { className: "mt-8 p-4 bg-slate-100 rounded-lg border border-slate-200", children: _jsxs("div", { className: "flex items-start space-x-3", children: [_jsx("div", { className: "flex-shrink-0 w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center mt-0.5", children: _jsx("div", { className: "w-2 h-2 rounded-full bg-orange-400" }) }), _jsxs("div", { className: "text-left space-y-1", children: [_jsx("p", { className: "text-sm font-medium text-slate-700", children: "Admin Note" }), _jsx("p", { className: "text-sm text-slate-600 leading-relaxed", children: "This could mean that the AI hasn't implemented this page yet. Ask it to implement it in the chat." })] })] }) })), _jsx("div", { className: "pt-6", children: _jsxs("button", { onClick: () => window.location.href = '/', className: "inline-flex items-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500", children: [_jsx("svg", { className: "w-4 h-4 mr-2", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" }) }), "Go Home"] }) })] }) }) }));
}
