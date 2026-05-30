import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import API from "./services/api";
import {
    Activity,
    AlertCircle,
    Bell,
    Box,
    CheckCircle2,
    Clock,
    Cpu,
    Eye,
    Globe,
    HardDrive,
    Search,
    Server,
    ShieldAlert,
    Trash2,
    User,
    Wifi
} from "lucide-react";

import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

// Mock Data Generators
const generateSparkline = (base, variance) => {
    return Array.from({ length: 15 }, (_, i) => ({
        time: i,
        value: base + Math.random() * variance - variance / 2
    }));
};





const networkData = [
    { time: "10:00", ingress: 120, egress: 80 },
    { time: "10:05", ingress: 200, egress: 110 },
    { time: "10:10", ingress: 170, egress: 95 },
    { time: "10:15", ingress: 240, egress: 150 },
    { time: "10:20", ingress: 220, egress: 130 },
    { time: "10:25", ingress: 280, egress: 180 },
    { time: "10:30", ingress: 250, egress: 160 },
];





// Servers array moved inside App to be dynamic



function App() {
    const [currentTime, setCurrentTime] = useState(new Date());
    const [pulse, setPulse] = useState(false);
    const [systemData, setSystemData] = useState(null);
    const [cpuHistory, setCpuHistory] = useState([]);
    const [memoryHistory, setMemoryHistory] = useState([]);
    const [diskHistory, setDiskHistory] = useState([]);
    const [networkHistory, setNetworkHistory] = useState([]);
    const [containers, setContainers] = useState([]);
    const [logs, setLogs] = useState([]);
    const [uptime, setUptime] = useState("-");
    const [runningContainers, setRunningContainers] = useState("-");
    const [isFirstFetch, setIsFirstFetch] = useState(true);
    const [serviceHealth, setServiceHealth] = useState({
        backend: "Offline",
        frontend: "Offline",
        prometheus: "Offline",
        grafana: "Offline"
    });

    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const notifiedRef = useRef(new Set());
    const isFirstFetchRef = useRef(true);
    const drawerRef = useRef(null);
    const dropdownRef = useRef(null);

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };

    const clearHistory = () => {
        setNotifications([]);
        notifiedRef.current.clear();
    };

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const cpuChartData = cpuHistory.map((value, index) => ({
        time: index,
        cpu: value,
    }));
    const memoryChartData = memoryHistory.map((value, index) => ({
        time: index,
        memory: value,
    }));
    const diskChartData = diskHistory.map((value, index) => ({
        time: index,
        disk: value,
    }));
    const networkChartData = networkHistory.map((value, index) => ({
        time: index,
        network: value,
    }));

    const activeAlertsCount = isFirstFetch ? "-" : notifications.filter(n => n.state === "firing").length;
    const pendingAlertsCount = isFirstFetch ? "-" : notifications.filter(n => n.state === "pending").length;

    let alertSeverity = "-";
    if (!isFirstFetch) {
        alertSeverity = "healthy";
        if (notifications.filter(n => n.state === "firing").length > 0) {
            const activeF = notifications.filter(n => n.state === "firing");
            if (activeF.some(n => n.severity === "critical")) {
                alertSeverity = "critical";
            } else if (activeF.some(n => n.severity === "warning")) {
                alertSeverity = "warning";
            } else {
                alertSeverity = "info";
            }
        } else if (notifications.filter(n => n.state === "pending").length > 0) {
            const activeP = notifications.filter(n => n.state === "pending");
            if (activeP.some(n => n.severity === "critical")) {
                alertSeverity = "critical";
            } else if (activeP.some(n => n.severity === "warning")) {
                alertSeverity = "warning";
            } else {
                alertSeverity = "info";
            }
        }
    }

    const systemHealthy = activeAlertsCount === 0 || activeAlertsCount === "-";

    const highCpu = Number(systemData?.cpu) > 80;
    const highMemory = Number(systemData?.usedMemory) > 14;
    const highDisk = Number(systemData?.diskUsed) > 80;
    const highNetwork = Number(systemData?.network) > 500000;

    const getRelativeTime = (isoString) => {
        const elapsed = currentTime.getTime() - new Date(isoString).getTime();
        const seconds = Math.floor(elapsed / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (seconds < 30) return "Detected just now";
        if (seconds < 60) return `Detected ${seconds} seconds ago`;
        if (minutes < 60) return `Detected ${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        return `Detected ${hours} hour${hours !== 1 ? 's' : ''} ago`;
    };

    const liveAlerts = notifications
        .map((alert) => {
            let type = "Critical";
            let icon = ShieldAlert;
            let color = "text-red-400";
            let bg = "bg-red-500/10";
            let border = "border-red-500/20";

            if (alert.state === "resolved") {
                type = "Resolved";
                icon = CheckCircle2;
                color = "text-emerald-400";
                bg = "bg-emerald-500/5";
                border = "border-emerald-500/20";
            } else if (alert.state === "pending") {
                type = "Pending";
                icon = AlertCircle;
                color = "text-amber-400";
                bg = "bg-amber-500/5 animate-pulse";
                border = "border-amber-500/20";
            } else if (alert.severity === "warning") {
                type = "Warning";
                icon = AlertCircle;
                color = "text-orange-400";
                bg = "bg-orange-500/10";
                border = "border-orange-500/20";
            } else if (alert.severity === "info") {
                type = "Info";
                icon = AlertCircle;
                color = "text-blue-400";
                bg = "bg-blue-500/10";
                border = "border-blue-500/20";
            }

            return {
                id: alert.id,
                name: alert.name,
                type,
                message: alert.state === 'resolved' ? `Prometheus Alert Resolved: ${alert.name}` : `Prometheus Alert Active: ${alert.name} - ${alert.summary}`,
                time: getRelativeTime(alert.activeAt),
                timestamp: new Date(alert.activeAt).getTime(),
                icon,
                color,
                bg,
                border
            };
        })
        .sort((a, b) => b.timestamp - a.timestamp);

    if (liveAlerts.length === 0) {
        liveAlerts.push({
            name: "Resolved",
            type: "No Active Incidents",
            message: "All monitored services are healthy",
            time: "Live",
            icon: CheckCircle2,
            color: "text-emerald-400",
            bg: "bg-emerald-500/5",
            border: "border-emerald-500/20"
        });
    }

    const healthyCount = [
        serviceHealth.backend,
        serviceHealth.frontend,
        serviceHealth.prometheus,
        serviceHealth.grafana
    ].filter(s => s === "Online").length;

    const totalCount = 4;
    const unhealthyCount = totalCount - healthyCount;

    const healthData = [
        { name: "Healthy", value: healthyCount, color: "#10b981" },
        { name: "Critical", value: unhealthyCount, color: "#ef4444" },
    ].filter(item => item.value > 0);

    const servers = containers.map((container) => ({
        name: container.name,
        region: "docker-local",
        status: container.state === "running" ? "Healthy" : "Critical",

        cpu: `${container.cpu}%`,

        ram: `${(
            (Number(container.memoryUsage) /
                Number(container.memoryLimit)) *
            100
        ).toFixed(1)}%`,

        disk: `${container.memoryUsage} MB`,

        latency: "N/A",

        uptime: container.status,
    }));

    const recentLogs = logs.slice(0, 10);

    const metrics = [
        {
            title: "CPU Usage",
            subtitle: "Avg across cluster",
            value: `${systemData?.cpu || 0}%`,
            change: "+4.2%",
            trend: "up",
            icon: Cpu,
            color: "text-cyan-400",
            bgAccent: "bg-cyan-500/20",
            sparkline: cpuHistory.length > 0 ? cpuHistory.map(v => ({ value: v })) : generateSparkline(40, 20)
        },
        {
            title: "Memory Usage",
            subtitle: "Total allocated",
            value: `${systemData?.usedMemory || 0} GB`,
            change: "+2.1%",
            trend: "up",
            icon: Activity,
            color: "text-emerald-400",
            bgAccent: "bg-emerald-500/20",
            sparkline: memoryHistory.length > 0 ? memoryHistory.map(v => ({ value: v })) : generateSparkline(65, 10)
        },
        {
            title: "Disk Usage",
            subtitle: "Read/Write ops",
            value: `${systemData?.diskUsed || 0}%`,
            change: "-1.4%",
            trend: "down",
            icon: HardDrive,
            color: "text-violet-400",
            bgAccent: "bg-violet-500/20",
            sparkline: diskHistory.length > 0 ? diskHistory.map(v => ({ value: v })) : generateSparkline(50, 10)
        },
        {
            title: "Network",
            subtitle: "Global throughput",
            value: `${systemData?.network ? Number(systemData.network).toFixed(0) : 0} B/s`,
            change: "+12.3%",
            trend: "up",
            icon: Wifi,
            color: "text-blue-400",
            bgAccent: "bg-blue-500/20",
            sparkline: networkHistory.length > 0 ? networkHistory.map(v => ({ value: v })) : generateSparkline(70, 15)
        },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await API.get("/api/system");
                setSystemData(res.data);

                const containerRes = await API.get("/api/containers");
                setContainers(containerRes.data);

                const logsRes = await API.get("/api/logs");
                setLogs(logsRes.data);

                const promCpuRes = await API.get("/api/prometheus/cpu");
                console.log(
                    "Prometheus CPU:",
                    promCpuRes.data.data.result[0]?.value?.[1]
                );

                setCpuHistory((prev) => [
                    ...prev.slice(-14),
                    Number(res.data.cpu),
                ]);

                setMemoryHistory((prev) => [
                    ...prev.slice(-14),
                    Number(res.data.usedMemory),
                ]);

                setDiskHistory((prev) => [
                    ...prev.slice(-14),
                    Number(res.data.diskUsed),
                ]);

                setNetworkHistory((prev) => [
                    ...prev.slice(-14),
                    Number(res.data.network || 0),
                ]);
            } catch (error) {
                console.error(error);
            }

            try {
                const overviewRes = await API.get("/api/system-overview");
                setUptime(overviewRes.data.uptime);
                setRunningContainers(overviewRes.data.containers);
            } catch (error) {
                console.error("Failed to fetch system overview:", error);
                setUptime("-");
                setRunningContainers("-");
            }

            try {
                const alertsRes = await API.get("/api/alerts");

                // Update unified notifications state
                const liveAlertsList = alertsRes.data.alerts || [];
                setNotifications(prev => {
                    const liveMap = new Map(liveAlertsList.map(a => [`${a.name}-${a.activeAt}`, a]));

                    // Mark items not in liveMap as resolved
                    const updated = prev.map(notif => {
                        const live = liveMap.get(notif.id);
                        if (live) {
                            return {
                                ...notif,
                                state: live.state,
                                severity: live.severity,
                                summary: live.summary
                            };
                        } else if (notif.state !== "resolved") {
                            return {
                                ...notif,
                                state: "resolved"
                            };
                        }
                        return notif;
                    });

                    const existingIds = new Set(prev.map(n => n.id));
                    const newItems = [];

                    liveAlertsList.forEach(a => {
                        const id = `${a.name}-${a.activeAt}`;
                        if (!existingIds.has(id)) {
                            newItems.push({
                                id,
                                name: a.name,
                                severity: a.severity,
                                summary: a.summary,
                                state: a.state,
                                activeAt: a.activeAt,
                                read: false
                            });

                            // Push browser notification if it's not the initial mounting fetch and not already notified
                            if (!isFirstFetchRef.current && !notifiedRef.current.has(id)) {
                                notifiedRef.current.add(id);
                                if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                                    try {
                                        new window.Notification("CloudVitals Alert", {
                                            body: `${a.name} (${a.severity}) is ${a.state === 'firing' ? 'firing' : 'pending'}: ${a.summary}`,
                                            icon: "/vite.svg"
                                        });
                                    } catch (err) {
                                        console.error("Failed to show browser notification:", err);
                                    }
                                }
                            } else {
                                // Add to notified set on first load so we don't spam if page is refreshed
                                notifiedRef.current.add(id);
                            }
                        }
                    });

                    // Prepend new alerts
                    return [...newItems, ...updated];
                });

                if (isFirstFetchRef.current) {
                    isFirstFetchRef.current = false;
                    setIsFirstFetch(false);
                }
            } catch (error) {
                console.error("Failed to fetch alerts:", error);
            }

            try {
                const healthRes = await API.get("/api/service-health");
                setServiceHealth(healthRes.data);
            } catch (error) {
                console.error("Failed to fetch service health:", error);
                setServiceHealth({
                    backend: "Offline",
                    frontend: "Offline",
                    prometheus: "Offline",
                    grafana: "Offline"
                });
            }
        };

        fetchData();

        const interval = setInterval(fetchData, 5000);

        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
            setPulse((prev) => !prev);
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (typeof window !== "undefined" && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission();
            }
        }
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                drawerRef.current && !drawerRef.current.contains(event.target) &&
                (!dropdownRef.current || !dropdownRef.current.contains(event.target))
            ) {
                setIsNotificationOpen(false);
            }
        };

        if (isNotificationOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isNotificationOpen]);

    const timeString = currentTime.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return (
        <div className="min-h-screen bg-[#020817] text-slate-200 font-sans selection:bg-cyan-500/30">
            <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">

                {/* Navbar */}
                <nav ref={drawerRef} className="relative mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl border border-slate-800/60 bg-slate-900/40 px-6 py-4 shadow-sm backdrop-blur-xl">
                    <div className="flex items-center justify-between w-full md:w-auto gap-4">
                        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                            <Globe size={24} />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-wider text-slate-100 flex items-center gap-2">
                                CLOUD<span className="text-cyan-400">VITALS</span>
                                <span className="ml-2 rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-mono text-cyan-400 uppercase tracking-widest hidden sm:inline-block">PROD</span>
                            </h1>
                            {systemData && (
                                <div className="text-xs text-slate-400 mt-1 flex gap-3 font-mono">
                                    <p>CPU Usage: {systemData.cpu}%</p>
                                    <p>Memory Used: {systemData.usedMemory} GB</p>
                                    <p>Disk Usage: {systemData.diskUsed}%</p>
                                </div>
                            )}
                        </div>

                        {/* Mobile notification bell */}
                        <button
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                            className="md:hidden relative text-slate-400 transition hover:text-slate-100 cursor-pointer"
                        >
                            <Bell size={20} />
                            {typeof activeAlertsCount === "number" && activeAlertsCount > 0 && (
                                <span className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse ${alertSeverity === "critical" ? "bg-red-500" : "bg-amber-500"
                                    }`}>
                                    {activeAlertsCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="hidden lg:flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-2 w-96 transition-colors focus-within:border-cyan-500/50">
                        <Search size={16} className="text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search resources, metrics, or alerts..."
                            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-400 font-mono"
                        />
                    </div>

                    <div className="hidden md:flex items-center gap-5">
                        <div className="flex items-center">
                            {systemHealthy ? (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono shadow-[0_0_10px_rgba(52,211,153,0.1)]">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></div>
                                    Healthy
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono shadow-[0_0_10px_rgba(239,68,68,0.1)] animate-pulse">
                                    <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                                    Warning
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-px bg-slate-800 mx-1"></div>

                        <div className="flex items-center gap-2 font-mono text-sm text-slate-400">
                            <Clock size={16} className="text-cyan-400" />
                            {timeString} UTC
                        </div>

                        <div className="h-6 w-px bg-slate-800"></div>

                        <button
                            onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                            className="relative text-slate-400 transition hover:text-cyan-400 hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] cursor-pointer"
                        >
                            <Bell size={20} />
                            {typeof activeAlertsCount === "number" && activeAlertsCount > 0 && (
                                <span className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white shadow-[0_0_10px_rgba(239,68,68,0.5)] animate-pulse ${alertSeverity === "critical" ? "bg-red-500" : "bg-amber-500"
                                    }`}>
                                    {activeAlertsCount}
                                </span>
                            )}
                        </button>

                        <div className="flex items-center gap-3 cursor-pointer group">
                            <div className="h-9 w-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:border-cyan-500/50 transition-all hover:shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                                <User size={18} />
                            </div>
                        </div>
                    </div>

                    {isNotificationOpen && createPortal(
                        <div
                            ref={dropdownRef}
                            className="fixed right-4 md:right-8 top-24 w-[calc(100vw-2rem)] sm:w-[380px] rounded-[20px] p-4 animate-dropdown-fade-in font-sans"
                            style={{
                                background: 'rgba(5, 10, 25, 0.98)',
                                backdropFilter: 'blur(30px)',
                                WebkitBackdropFilter: 'blur(30px)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6)',
                                zIndex: 9999,
                            }}
                        >
                            {/* Drawer Header */}
                            <div
                                className="flex items-center justify-between pb-3 mb-3"
                                style={{
                                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                                }}
                            >
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-sm font-bold text-slate-100 uppercase tracking-wider font-mono">Notifications</span>
                                    <span className="text-[10px] text-cyan-400 font-semibold font-mono">
                                        {notifications.filter(n => !n.read && n.state !== 'resolved').length} New Alert{notifications.filter(n => !n.read && n.state !== 'resolved').length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); markAllAsRead(); }}
                                        className="text-[10px] font-mono text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Mark all as read"
                                    >
                                        <Eye size={12} />
                                        Read All
                                    </button>
                                    <span className="text-slate-800 font-mono text-xs">|</span>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); clearHistory(); }}
                                        className="text-[10px] font-mono text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
                                        title="Clear all history"
                                    >
                                        <Trash2 size={12} />
                                        Clear
                                    </button>
                                </div>
                            </div>

                            {/* Drawer List */}
                            <div className="max-h-80 overflow-y-auto custom-scrollbar pr-1 space-y-2">
                                {notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center font-mono">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-4 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                                            <CheckCircle2 size={24} />
                                        </div>
                                        <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                                            ✓ System Healthy
                                        </h4>
                                        <p className="text-xs text-slate-400">No active notifications</p>
                                    </div>
                                ) : (
                                    notifications.map((alert) => {
                                        const isResolved = alert.state === "resolved";
                                        const isWarning = alert.severity === "warning";

                                        // Colors and states determination
                                        let severityLabel = "CRITICAL";
                                        let badgeBg = "bg-red-500/10";
                                        let badgeText = "text-red-400";
                                        let badgeBorder = "border-red-500/20";
                                        let accentColor = "#ef4444"; // Red
                                        let dotClass = "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse";

                                        if (isResolved) {
                                            severityLabel = "HEALTHY";
                                            badgeBg = "bg-emerald-500/10";
                                            badgeText = "text-emerald-400";
                                            badgeBorder = "border-emerald-500/20";
                                            accentColor = "#10b981"; // Green
                                            dotClass = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]";
                                        } else if (isWarning) {
                                            severityLabel = "WARNING";
                                            badgeBg = "bg-amber-500/10";
                                            badgeText = "text-amber-400";
                                            badgeBorder = "border-amber-500/20";
                                            accentColor = "#f59e0b"; // Amber
                                            dotClass = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)] animate-pulse";
                                        } else if (alert.severity === "info") {
                                            severityLabel = "INFO";
                                            badgeBg = "bg-blue-500/10";
                                            badgeText = "text-blue-400";
                                            badgeBorder = "border-blue-500/20";
                                            accentColor = "#3b82f6"; // Blue
                                            dotClass = "bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]";
                                        }

                                        return (
                                            <div
                                                key={alert.id}
                                                onClick={(e) => { e.stopPropagation(); markAsRead(alert.id); }}
                                                className="group relative flex flex-col gap-2.5 p-4 transition-all cursor-pointer hover:bg-white/[0.06] duration-200"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                                    borderLeft: `4px solid ${accentColor}`,
                                                    borderRadius: '12px',
                                                }}
                                            >
                                                {/* Unread indicator */}
                                                {!alert.read && !isResolved && (
                                                    <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)] animate-pulse"></span>
                                                )}

                                                {/* Top Row: Severity Badge and Status Badge */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-wider font-extrabold border ${badgeBg} ${badgeText} ${badgeBorder}`}>
                                                        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`}></span>
                                                        {severityLabel}
                                                    </span>
                                                    
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold border ${
                                                        isResolved ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                                                        alert.state === "pending" ? "bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse" :
                                                        "bg-red-500/10 text-red-400 border-red-500/20"
                                                    }`}>
                                                        {isResolved ? 'Resolved' : alert.state === 'pending' ? 'Pending' : 'Firing'}
                                                    </span>
                                                </div>

                                                {/* Alert Title */}
                                                <h4 className="text-xs font-bold text-slate-100 group-hover:text-cyan-400 transition-colors leading-tight mt-0.5">
                                                    {alert.name}
                                                </h4>

                                                {/* Alert Description */}
                                                <p className="text-xs text-slate-400 leading-relaxed font-sans">
                                                    {alert.summary}
                                                </p>

                                                {/* Detection / Relative Time */}
                                                <span className="text-[9px] text-slate-500 font-mono mt-0.5">
                                                    Detected {getRelativeTime(alert.activeAt)}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>,
                        document.body
                    )}
                </nav>

                {/* Floating Alert Notifications */}
                <div className="fixed top-28 right-8 flex flex-col gap-3 z-50 pointer-events-none">
                    {highCpu && (
                        <div className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border border-red-500/30 text-red-400 p-3.5 rounded-xl shadow-[0_10px_30px_rgba(239,68,68,0.15)] animate-in slide-in-from-right-8 fade-in duration-300">
                            <ShieldAlert size={18} className="animate-pulse" />
                            <span className="text-sm font-semibold tracking-wide">High CPU Usage Detected</span>
                        </div>
                    )}
                    {highMemory && (
                        <div className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border border-red-500/30 text-red-400 p-3.5 rounded-xl shadow-[0_10px_30px_rgba(239,68,68,0.15)] animate-in slide-in-from-right-8 fade-in duration-300">
                            <AlertCircle size={18} className="animate-pulse" />
                            <span className="text-sm font-semibold tracking-wide">Memory Usage Critical</span>
                        </div>
                    )}
                    {highNetwork && (
                        <div className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border border-yellow-500/30 text-yellow-400 p-3.5 rounded-xl shadow-[0_10px_30px_rgba(234,179,8,0.15)] animate-in slide-in-from-right-8 fade-in duration-300">
                            <Wifi size={18} className="animate-pulse" />
                            <span className="text-sm font-semibold tracking-wide">High Network Activity</span>
                        </div>
                    )}
                    {highDisk && (
                        <div className="flex items-center gap-3 bg-slate-900/95 backdrop-blur-xl border border-orange-500/30 text-orange-400 p-3.5 rounded-xl shadow-[0_10px_30px_rgba(249,115,22,0.15)] animate-in slide-in-from-right-8 fade-in duration-300">
                            <HardDrive size={18} className="animate-pulse" />
                            <span className="text-sm font-semibold tracking-wide">Disk Usage Critical</span>
                        </div>
                    )}
                </div>

                {/* Hero / System Overview */}
                <section className="relative mb-8 overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/50 p-8 md:p-10 shadow-2xl backdrop-blur-md">
                    {/* Decorative Glow */}
                    <div className="absolute right-0 top-0 h-[500px] w-[500px] -translate-y-1/2 translate-x-1/3 rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none"></div>
                    <div className="absolute left-0 bottom-0 h-[300px] w-[300px] translate-y-1/3 -translate-x-1/3 rounded-full bg-blue-500/5 blur-[100px] pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <div className={`relative flex h-3 w-3 items-center justify-center`}>
                                    <div className={`absolute h-full w-full rounded-full bg-emerald-500 ${pulse ? 'animate-ping opacity-75' : 'opacity-100'}`}></div>
                                    <div className="relative h-2 w-2 rounded-full bg-emerald-400"></div>
                                </div>
                                <span className="font-mono text-sm tracking-wide text-emerald-400 uppercase drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">
                                    Global Infrastructure Operational
                                </span>
                                <span className="mx-2 hidden sm:inline-block text-slate-700">•</span>
                                <span className="text-xs text-slate-500 font-mono">Last updated: {timeString}</span>
                            </div>

                            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-3">
                                System Overview
                            </h2>
                            <p className="max-w-2xl text-slate-400 text-lg">
                                Real-time observability across your host system and running Docker containers.
                            </p>
                        </div>

                        <div className="flex flex-wrap sm:flex-nowrap gap-4">
                            <div className="w-full sm:w-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-4 backdrop-blur-md hover:border-emerald-500/40 transition-colors">
                                <p className="text-xs font-mono text-emerald-500/70 uppercase tracking-wider mb-1">System Uptime</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-4xl font-bold text-emerald-400">{uptime}</h3>
                                </div>
                            </div>
                            <div className="w-full sm:w-auto rounded-2xl border border-cyan-500/20 bg-cyan-500/5 px-6 py-4 backdrop-blur-md hover:border-cyan-500/40 transition-colors">
                                <p className="text-xs font-mono text-cyan-500/70 uppercase tracking-wider mb-1">Running Containers</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 className="text-4xl font-bold text-cyan-400">{runningContainers}</h3>
                                </div>
                            </div>
                            {/* Active Alerts Card */}
                            <div className="w-full sm:w-auto rounded-2xl border border-red-500/20 bg-red-500/5 px-6 py-4 backdrop-blur-md hover:border-red-500/40 transition-colors min-w-[180px]">
                                <p className="text-xs font-mono text-red-500/70 uppercase tracking-wider mb-1">Active Alerts</p>
                                <div className="flex items-baseline gap-2 flex-wrap">
                                    <h3 className="text-4xl font-bold text-red-400">
                                        {activeAlertsCount === "-" ? "-" : `${activeAlertsCount} Active Alert${activeAlertsCount !== 1 ? 's' : ''}`}
                                    </h3>
                                    {activeAlertsCount !== "-" && pendingAlertsCount !== "-" && (
                                        <span className="text-xs text-slate-500 font-mono">({pendingAlertsCount} pending)</span>
                                    )}
                                </div>
                                {notifications.filter(n => n.state === "firing").length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 space-y-0.5 max-h-16 overflow-y-auto custom-scrollbar">
                                        {notifications.filter(n => n.state === "firing").map((alert, i) => (
                                            <div key={i} className="flex items-center gap-1.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"></span>
                                                {alert.name}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {/* Alert Severity Card */}
                            <div className={`w-full sm:w-auto rounded-2xl border px-6 py-4 backdrop-blur-md transition-colors min-w-[180px] ${
                                alertSeverity === "critical" ? "border-red-500/20 bg-red-500/5 hover:border-red-500/40" :
                                alertSeverity === "warning" ? "border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40" :
                                alertSeverity === "info" ? "border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40" :
                                alertSeverity === "healthy" ? "border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40" :
                                "border-slate-800 bg-slate-900/40"
                            }`}>
                                <p className={`text-xs font-mono uppercase tracking-wider mb-1 ${
                                    alertSeverity === "critical" ? "text-red-500/70" :
                                    alertSeverity === "warning" ? "text-amber-500/70" :
                                    alertSeverity === "info" ? "text-blue-500/70" :
                                    alertSeverity === "healthy" ? "text-emerald-500/70" :
                                    "text-slate-500/70"
                                }`}>ALERT SEVERITY</p>
                                <div className="flex items-baseline gap-2">
                                    <h3 
                                        className={`font-bold uppercase tracking-wide ${
                                            alertSeverity === "critical" ? "text-red-400" :
                                            alertSeverity === "warning" ? "text-amber-400" :
                                            alertSeverity === "info" ? "text-blue-400" :
                                            alertSeverity === "healthy" ? "text-emerald-400" :
                                            "text-slate-400"
                                        }`}
                                        style={{
                                            fontSize: 'clamp(1rem, 1.5vw, 2rem)',
                                            whiteSpace: 'nowrap',
                                            maxWidth: '100%',
                                        }}
                                    >
                                        {alertSeverity ? alertSeverity.toUpperCase() : "UNKNOWN"}
                                    </h3>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Metrics Grid */}
                <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {metrics.map((item, index) => {
                        const Icon = item.icon;
                        const CustomLineChart = ({ data, color }) => (
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={data}>
                                    <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        );

                        // Extract hex color from tailwind class string roughly for recharts
                        const hexColor = item.color.includes('cyan') ? '#22d3ee' :
                            item.color.includes('emerald') ? '#34d399' :
                                item.color.includes('violet') ? '#a78bfa' :
                                    item.color.includes('blue') ? '#60a5fa' :
                                        item.color.includes('green') ? '#4ade80' :
                                            item.color.includes('orange') ? '#fb923c' :
                                                item.color.includes('pink') ? '#f472b6' : '#f87171';

                        const bgClass = item.color.replace('text-', 'bg-');

                        return (
                            <div
                                key={index}
                                className="group relative overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-slate-600 hover:bg-slate-800/50 hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)]"
                            >
                                {/* Top glow effect on hover */}
                                <div className={`absolute top-0 left-0 w-full h-0.5 ${bgClass} opacity-0 group-hover:opacity-100 transition-opacity blur-[2px]`}></div>

                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex gap-3">
                                        <div className={`mt-0.5 rounded-lg p-2 ${item.bgAccent} ${item.color}`}>
                                            <Icon size={18} />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-300 group-hover:text-slate-100 transition-colors">{item.title}</h3>
                                            <p className="text-xs text-slate-500 font-mono">{item.subtitle}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-end justify-between mb-3">
                                    <div>
                                        <div className="text-3xl font-bold text-slate-100 mb-1 tracking-tight">{item.value}</div>
                                        <div className={`flex items-center text-xs font-mono ${item.trend === 'up' ? (item.title === 'Active Alerts' ? 'text-red-400' : 'text-emerald-400') : (item.title === 'Active Alerts' ? 'text-emerald-400' : 'text-slate-400')}`}>
                                            {item.change} <span className="ml-1 text-slate-600">vs last hr</span>
                                        </div>
                                    </div>
                                    <div className="h-10 w-20 opacity-40 group-hover:opacity-100 transition-opacity filter drop-shadow-[0_0_3px_currentColor] text-inherit">
                                        <CustomLineChart data={item.sparkline} color={hexColor} />
                                    </div>
                                </div>

                                {/* Progress Bar */}
                                <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-slate-950/50 border border-slate-800">
                                    <div
                                        className={`h-full rounded-full ${bgClass} shadow-[0_0_10px_currentColor]`}
                                        style={{ width: item.value.includes('%') ? item.value : '100%' }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {/* Live Mini Charts from Tutorial */}
                <section className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 backdrop-blur-sm transition-all hover:border-slate-700/80">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-semibold text-slate-200 font-mono">Memory Live</h3>
                            <span className={`text-sm font-bold font-mono ${highMemory ? 'text-red-400' : 'text-emerald-400'}`}>{systemData?.usedMemory || 0} GB</span>
                        </div>
                        <ResponsiveContainer width="100%" height={100}>
                            <LineChart data={memoryChartData}>
                                <Line type="monotone" dataKey="memory" stroke="#38BDF8" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 backdrop-blur-sm transition-all hover:border-slate-700/80">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-semibold text-slate-200 font-mono">Disk Live</h3>
                            <span className={`text-sm font-bold font-mono ${highDisk ? 'text-red-400' : 'text-violet-400'}`}>{systemData?.diskUsed || 0}%</span>
                        </div>
                        <ResponsiveContainer width="100%" height={100}>
                            <LineChart data={diskChartData}>
                                <Line type="monotone" dataKey="disk" stroke="#A78BFA" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-5 backdrop-blur-sm transition-all hover:border-slate-700/80">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-semibold text-slate-200 font-mono">Network Live</h3>
                            <span className={`text-sm font-bold font-mono ${highNetwork ? 'text-red-400' : 'text-yellow-400'}`}>{systemData?.network || 0} B/s</span>
                        </div>
                        <ResponsiveContainer width="100%" height={100}>
                            <LineChart data={networkChartData}>
                                <Line type="monotone" dataKey="network" stroke="#FACC15" strokeWidth={2} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </section>

                {/* Main Charts */}
                <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
                    {/* CPU Chart */}
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-sm transition-all hover:border-slate-700/80">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-200">CPU Compute</h3>
                                <p className="text-xs text-slate-500 font-mono mt-1">Aggregate cluster utilization</p>
                            </div>
                            <select className="bg-slate-950/50 border border-slate-800 text-xs text-slate-400 rounded-md px-3 py-1.5 outline-none focus:border-cyan-500/50 font-mono transition-colors">
                                <option>Last 1 Hour</option>
                                <option>Last 6 Hours</option>
                                <option>Last 24 Hours</option>
                            </select>
                        </div>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={cpuChartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
                                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} fontFamily="monospace" />
                                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dx={-10} fontFamily="monospace" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(2, 8, 23, 0.9)', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', backdropFilter: 'blur(4px)' }}
                                        itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                                        cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '3 3' }}
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="cpu"
                                        stroke="#22d3ee"
                                        strokeWidth={3}
                                        dot={{ r: 0 }}
                                        activeDot={{ r: 6, fill: '#020817', stroke: '#22d3ee', strokeWidth: 2 }}
                                        style={{ filter: 'drop-shadow(0px 0px 8px rgba(34,211,238,0.4))' }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Network Chart */}
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-sm transition-all hover:border-slate-700/80">
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-200">Network Traffic</h3>
                                <p className="text-xs text-slate-500 font-mono mt-1">Ingress vs Egress (Mbps)</p>
                            </div>
                            <div className="flex gap-4 text-xs font-mono bg-slate-950/50 px-3 py-1.5 rounded-md border border-slate-800">
                                <div className="flex items-center gap-2 text-slate-300"><div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></div> In</div>
                                <div className="flex items-center gap-2 text-slate-300"><div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"></div> Out</div>
                            </div>
                        </div>
                        <div className="h-[280px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={networkData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
                                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} opacity={0.5} />
                                    <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dy={10} fontFamily="monospace" />
                                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} dx={-10} fontFamily="monospace" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'rgba(2, 8, 23, 0.9)', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', backdropFilter: 'blur(4px)' }}
                                        cursor={{ stroke: '#334155', strokeWidth: 1, strokeDasharray: '3 3' }}
                                    />
                                    <Area type="monotone" dataKey="ingress" stroke="#3b82f6" fillOpacity={1} fill="url(#colorIn)" strokeWidth={2} />
                                    <Area type="monotone" dataKey="egress" stroke="#a855f7" fillOpacity={1} fill="url(#colorOut)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </section>

                {/* Secondary Charts & Alerts */}
                <section className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Container Resource Usage */}
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-sm transition-all hover:border-slate-700/80">
                        <h3 className="text-lg font-semibold text-slate-200 mb-6 font-mono tracking-wide uppercase">Container CPU Usage</h3>
                        <div className="h-[220px] flex flex-col justify-center gap-4">
                            {[
                                { name: "Backend", key: "backend", color: "bg-cyan-500", text: "text-cyan-400" },
                                { name: "Frontend", key: "frontend", color: "bg-emerald-500", text: "text-emerald-400" },
                                { name: "Prometheus", key: "prometheus", color: "bg-orange-500", text: "text-orange-400" },
                                { name: "Grafana", key: "grafana", color: "bg-purple-500", text: "text-purple-400" }
                            ].map((service, index) => {
                                const container = containers.find(c => c.name.includes(service.key));
                                const rawCpu = container ? parseFloat(container.cpu) : null;
                                const cpuPercent = rawCpu !== null && !isNaN(rawCpu) ? rawCpu : null;
                                const displayValue = cpuPercent !== null ? `${cpuPercent.toFixed(2)}%` : "N/A";

                                return (
                                    <div key={index} className="space-y-2">
                                        <div className="flex justify-between items-center text-xs font-mono">
                                            <span className="text-slate-400 font-semibold">{service.name}</span>
                                            <span className={`font-bold ${service.text}`}>{displayValue}</span>
                                        </div>
                                        <div className="h-2 w-full rounded-full bg-slate-950/60 border border-slate-800 overflow-hidden relative">
                                            {cpuPercent !== null && (
                                                <div
                                                    className={`h-full rounded-full ${service.color} transition-all duration-1000 shadow-[0_0_10px_currentColor]`}
                                                    style={{ width: `${Math.min(cpuPercent, 100)}%` }}
                                                ></div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Service Health Status */}
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-sm transition-all hover:border-slate-700/80">
                        <h3 className="text-lg font-semibold text-slate-200 mb-6 font-mono tracking-wide uppercase">Service Health Status</h3>
                        <div className="h-[220px] flex items-center justify-between gap-2">
                            {/* Donut Chart Container */}
                            <div className="w-1/2 h-full relative flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={healthData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={75}
                                            paddingAngle={healthData.length > 1 ? 5 : 0}
                                            dataKey="value"
                                            stroke="none"
                                        >
                                            {healthData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} style={{ filter: `drop-shadow(0px 0px 4px ${entry.color}80)` }} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: 'rgba(2, 8, 23, 0.9)', borderColor: '#1e293b', borderRadius: '8px', fontSize: '12px', backdropFilter: 'blur(4px)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
                                    <span className="text-2xl font-bold text-slate-100 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">{healthyCount} / {totalCount}</span>
                                    <span className={`text-[9px] font-mono uppercase tracking-widest mt-1 ${unhealthyCount > 0 ? 'text-red-400 animate-pulse font-semibold' : 'text-emerald-400'}`}>
                                        {unhealthyCount > 0 ? 'Degraded' : 'Healthy'}
                                    </span>
                                </div>
                            </div>

                            {/* Service Status List */}
                            <div className="w-1/2 flex flex-col justify-center gap-3 pl-4 border-l border-slate-800/60">
                                {[
                                    { name: "Backend", key: "backend" },
                                    { name: "Frontend", key: "frontend" },
                                    { name: "Prometheus", key: "prometheus" },
                                    { name: "Grafana", key: "grafana" }
                                ].map((service, i) => {
                                    const isOnline = serviceHealth[service.key] === "Online";
                                    return (
                                        <div key={i} className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400 font-mono font-semibold">{service.name}</span>
                                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[9px] font-mono uppercase tracking-wider font-bold
                                                ${isOnline ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse"}`}
                                            >
                                                <span className={`h-1 w-1 rounded-full ${isOnline ? "bg-emerald-400" : "bg-red-400"}`}></span>
                                                {serviceHealth[service.key] || "Offline"}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Alert Feed */}
                    <div className="rounded-2xl border border-slate-800/60 bg-slate-900/40 p-6 backdrop-blur-sm flex flex-col h-full transition-all hover:border-slate-700/80">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-slate-200">Incident Activity</h3>
                            <span className="text-xs text-slate-400 hover:text-cyan-400 cursor-pointer transition-colors font-mono">View All ↗</span>
                        </div>
                        <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {liveAlerts.map((alert, index) => {
                                const AlertIcon = alert.icon;
                                return (
                                    <div key={index} className={`group flex gap-3 p-3.5 rounded-xl border ${alert.border} ${alert.bg} transition-all hover:brightness-125`}>
                                        <div className={`${alert.color} shrink-0 mt-0.5`}>
                                            <AlertIcon size={18} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className={`text-xs font-semibold ${alert.color}`}>{alert.type}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">{alert.time}</span>
                                            </div>
                                            <p className="text-xs text-slate-300 truncate group-hover:whitespace-normal transition-all">{alert.message}</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </section>

                {/* Infrastructure Table */}
                <section className="mb-8">
                    <div className="overflow-hidden rounded-2xl border border-slate-800/60 bg-slate-900/40 backdrop-blur-sm shadow-xl">
                        <div className="border-b border-slate-800/60 px-6 py-5 flex flex-wrap items-center justify-between gap-4 bg-slate-900/80">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
                                    <Server size={18} />
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-200">Infrastructure Nodes</h3>
                                    <p className="text-xs text-slate-500 font-mono">Live view of active resources</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button className="px-4 py-1.5 text-xs font-mono rounded border border-slate-700 hover:bg-slate-800 hover:border-slate-500 text-slate-300 transition-colors shadow-sm">Filter</button>
                                <button className="px-4 py-1.5 text-xs font-mono rounded border border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors shadow-[0_0_10px_rgba(34,211,238,0.1)]">Export CSV</button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse whitespace-nowrap">
                                <thead className="bg-slate-950/80 text-xs uppercase tracking-wider text-slate-500 font-mono">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Node Name</th>
                                        <th className="px-6 py-4 font-medium">Region</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium">CPU</th>
                                        <th className="px-6 py-4 font-medium">RAM</th>
                                        <th className="px-6 py-4 font-medium">Disk</th>
                                        <th className="px-6 py-4 font-medium">Latency</th>
                                        <th className="px-6 py-4 font-medium text-right">Uptime</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-800/40 bg-slate-900/20">
                                    {servers.map((server, index) => (
                                        <tr
                                            key={index}
                                            className="group transition-colors hover:bg-slate-800/40 cursor-pointer"
                                        >
                                            <td className="px-6 py-4 font-mono text-slate-300 group-hover:text-cyan-400 transition-colors flex items-center gap-2">
                                                <Box size={14} className="text-slate-600 group-hover:text-cyan-500/50" />
                                                {server.name}
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 font-mono text-xs">{server.region}</td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest
                          ${server.status === "Healthy" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_8px_rgba(52,211,153,0.15)]" :
                                                        server.status === "Warning" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_8px_rgba(251,191,36,0.15)]" :
                                                            "bg-red-500/10 text-red-400 border border-red-500/20 shadow-[0_0_8px_rgba(239,68,68,0.15)]"}`}
                                                >
                                                    <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${server.status === "Healthy" ? "bg-emerald-400" : server.status === "Warning" ? "bg-amber-400" : "bg-red-400"}`}></span>
                                                    {server.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-300 font-mono text-xs w-8">{server.cpu}</span>
                                                    <div className="w-16 h-1.5 rounded-full bg-slate-800 hidden sm:block">
                                                        <div className={`h-full rounded-full ${parseInt(server.cpu) > 80 ? 'bg-red-400' : 'bg-cyan-400'}`} style={{ width: server.cpu }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-300 font-mono text-xs w-8">{server.ram}</span>
                                                    <div className="w-16 h-1.5 rounded-full bg-slate-800 hidden sm:block">
                                                        <div className={`h-full rounded-full ${parseInt(server.ram) > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: server.ram }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-400 font-mono text-xs">{server.disk}</td>
                                            <td className="px-6 py-4 font-mono text-slate-400 text-xs">{server.latency}</td>
                                            <td className="px-6 py-4 text-slate-500 text-xs text-right font-mono">{server.uptime}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* Live Logs */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 mt-8">
                    <h3 className="text-xl font-semibold text-white mb-4">
                        Live Logs
                    </h3>
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                        {recentLogs.map((log, index) => (
                            <div
                                key={index}
                                className="text-xs font-mono text-slate-300 border-b border-slate-800 pb-2"
                            >
                                {log.log}
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}

export default App;
