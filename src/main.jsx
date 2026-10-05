import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LayoutDashboard,
  ShieldCheck,
  TriangleAlert,
  ClipboardCheck,
  Activity,
  Users,
  Building2,
  FileText,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Plus,
  ArrowUpLeft,
  ArrowDownLeft,
  MoreHorizontal,
  CalendarDays,
  Download,
  Filter,
  Clock3,
  CheckCircle2,
  MapPin,
  Menu,
  X,
  Leaf,
  GraduationCap,
  HardHat,
  BriefcaseBusiness,
  ScanLine,
  Smartphone,
} from "lucide-react";
import "./style.css";
import "./workspace.css";
import "./advanced.css";
import "./polish.css";

const INCIDENTS_MODULE = "حوادث و رخدادها";
const LEGACY_INCIDENTS_KEY = "karen-hse-incidents";
const recordsKey = (moduleName) => `karen-hse-records-v1-${moduleName}`;

function readArray(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function writeArray(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function makeId() {
  return (
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );
}

function normalizeSearch(value) {
  return String(value ?? "")
    .toLocaleLowerCase("fa-IR")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[۰-۹]/g, (digit) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(digit)])
    .replace(/[٠-٩]/g, (digit) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(digit)])
    .replace(/\s+/g, " ")
    .trim();
}

function formatFaDate(
  date,
  options = { day: "numeric", month: "long", year: "numeric" },
) {
  const safeDate =
    date instanceof Date && Number.isFinite(date.getTime()) ? date : new Date();
  return new Intl.DateTimeFormat("fa-IR", options).format(safeDate);
}

function dashboardIncidentRows() {
  const legacy = readArray(LEGACY_INCIDENTS_KEY).filter(
    (row) => Array.isArray(row) && row.length >= 6,
  );
  const records = readArray(recordsKey(INCIDENTS_MODULE)).filter(
    (record) => record && typeof record.title === "string",
  );
  const recordTitles = new Set(
    records.map((record) => normalizeSearch(record.title)),
  );
  const legacyUnique = legacy.filter(
    (row) => !recordTitles.has(normalizeSearch(row[2])),
  );
  const current = records.map((record, index) => {
    const status =
      record.status === "بسته شده"
        ? "بسته شده"
        : record.status === "در حال پیگیری"
          ? "اقدام اصلاحی"
          : "در حال بررسی";
    const tone =
      status === "بسته شده"
        ? "green"
        : status === "اقدام اصلاحی"
          ? "blue"
          : "orange";
    const date =
      record.date || formatFaDate(new Date(record.created || Date.now()));
    return [
      record.code || `INC-${String(index + 1).padStart(3, "0")}`,
      record.kind || "گزارش رخداد",
      record.title,
      record.location || "محل ثبت نشده",
      date,
      status,
      tone,
    ];
  });
  return [...current, ...legacyUnique];
}

function downloadTextFile(contents, filename, type) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function App() {
  const [active, setActive] = useState("نمای کلی");
  const [period, setPeriod] = useState("۳۰ روز گذشته");
  const [chartPeriod, setChartPeriod] = useState("۶ ماه گذشته");
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState("");
  const [toast, setToast] = useState("");
  const [mobile, setMobile] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [incidentFilter, setIncidentFilter] = useState("همه وضعیت‌ها");
  const [incidentRows, setIncidentRows] = useState(dashboardIncidentRows);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const searchRef = useRef(null);
  const toastTimerRef = useRef(null);
  const modalRef = useRef(null);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => {});
    }

    const refreshIncidents = () => setIncidentRows(dashboardIncidentRows());
    const handleStorage = (event) => {
      if (
        !event.key ||
        event.key === LEGACY_INCIDENTS_KEY ||
        event.key === recordsKey(INCIDENTS_MODULE)
      ) {
        refreshIncidents();
      }
    };
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("karen-hse:incidents-updated", refreshIncidents);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(
        "karen-hse:incidents-updated",
        refreshIncidents,
      );
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  useEffect(() => {
    const handleInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      notify("کارن HSE روی دستگاه شما نصب شد");
    };
    setIsInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        navigator.standalone === true,
    );
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);
  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setMobileSearchOpen(true);
        requestAnimationFrame(() => searchRef.current?.focus());
      }
      if (event.key === "Escape") {
        setShowModal(false);
        setReportType("");
        setMobile(false);
        setMobileSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  useEffect(() => {
    if (showModal) {
      const focusTarget = modalRef.current?.querySelector(
        "[autofocus], .report-options button, .modal-close",
      );
      (focusTarget || modalRef.current)?.focus();
    }
  }, [showModal]);
  useEffect(() => {
    if (!showModal && !mobile) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showModal, mobile]);
  const currentDate = new Date();
  const currentHour = currentDate.getHours();
  const greeting =
    currentHour < 11
      ? "صبح بخیر"
      : currentHour < 17
        ? "روز بخیر"
        : currentHour < 20
          ? "عصر بخیر"
          : "شب بخیر";
  const dateLabel = formatFaDate(currentDate, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const nav = [
    { name: "نمای کلی", icon: LayoutDashboard },
    { name: "حوادث و رخدادها", icon: TriangleAlert, badge: "۴" },
    { name: "بازرسی‌ها", icon: ClipboardCheck },
    { name: "اقدامات اصلاحی", icon: ShieldCheck, badge: "۸" },
    { name: "ارزیابی ریسک", icon: Activity },
    { name: "مدیریت پروژه‌ها", icon: Building2 },
    { name: "کارکنان و آموزش", icon: Users },
    { name: "گزارش‌ها", icon: FileText },
  ];
  function notify(message) {
    setToast(message);
    window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(""), 3000);
  }
  function closeReportModal() {
    setShowModal(false);
    setReportType("");
  }
  function saveDashboardRecord(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get("title") || "").trim();
    const site = String(form.get("site") || "").trim();
    const description = String(form.get("description") || "").trim();
    if (!title || !site) return;

    const moduleName =
      reportType === "بازرسی جدید"
        ? "بازرسی‌ها"
        : reportType === "اقدام اصلاحی"
          ? "اقدامات اصلاحی"
          : INCIDENTS_MODULE;
    const prefix =
      moduleName === INCIDENTS_MODULE
        ? "INC"
        : moduleName === "بازرسی‌ها"
          ? "INSP"
          : "CAPA";
    const key = recordsKey(moduleName);
    const current = readArray(key);
    let sequence = current.length + 1;
    let code = `${prefix}-${String(sequence).padStart(3, "0")}`;
    while (current.some((record) => record.code === code)) {
      sequence += 1;
      code = `${prefix}-${String(sequence).padStart(3, "0")}`;
    }
    const now = new Date();
    const record = {
      id: makeId(),
      code,
      kind: reportType || "گزارش رخداد",
      title,
      location: site,
      owner: "ثبت از داشبورد",
      priority: "متوسط",
      description,
      dueDate: "",
      status: "جدید",
      date: formatFaDate(now),
      created: now.toISOString(),
      updated: now.toISOString(),
    };

    if (!writeArray(key, [record, ...current])) {
      notify("ذخیره‌سازی در این مرورگر در دسترس نیست. دوباره تلاش کنید.");
      return;
    }
    if (moduleName === INCIDENTS_MODULE) {
      setIncidentRows(dashboardIncidentRows());
      window.dispatchEvent(new Event("karen-hse:incidents-updated"));
    } else {
      setActive(moduleName);
    }
    closeReportModal();
    notify("گزارش در فضای محلی همین دستگاه ثبت شد");
  }
  async function installApp() {
    if (!installPrompt) {
      notify(
        /iPad|iPhone|iPod/.test(navigator.userAgent)
          ? "برای نصب، منوی اشتراک‌گذاری مرورگر و «افزودن به صفحه اصلی» را انتخاب کنید."
          : "از منوی مرورگر گزینه «نصب برنامه» یا «افزودن به صفحه اصلی» را انتخاب کنید.",
      );
      return;
    }
    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        setIsInstalled(true);
        notify("درخواست نصب برنامه پذیرفته شد");
      }
    } catch {
      notify("نصب برنامه از منوی مرورگر در دسترس است");
    } finally {
      setInstallPrompt(null);
    }
  }
  function exportDashboardReport(rows) {
    const escapeCsv = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const csv = [
      ["شناسه", "نوع رخداد", "عنوان", "محل", "تاریخ ثبت", "وضعیت"],
      ...rows.map((row) => row.slice(0, 6)),
    ]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\r\n");
    downloadTextFile(
      `\ufeff${csv}`,
      `karen-hse-report-${Date.now()}.csv`,
      "text/csv;charset=utf-8",
    );
    notify("گزارش رخدادها آماده دانلود است");
  }
  const incidents = [
    [
      "INC-۲۴۸",
      "نزدیک به حادثه",
      "سقوط ابزار از ارتفاع",
      "پروژه برج آریا · طبقه ۸",
      "امروز، ۱۰:۲۴",
      "در حال بررسی",
      "orange",
    ],
    [
      "INC-۲۴۷",
      "شرایط ناایمن",
      "نشتی روغن هیدرولیک",
      "کارخانه تولید · سالن ۲",
      "دیروز، ۱۶:۴۰",
      "اقدام اصلاحی",
      "blue",
    ],
    [
      "INC-۲۴۶",
      "حادثه منجر به آسیب",
      "لغزش در مسیر تردد",
      "پروژه پارس · محوطه غربی",
      "۲۲ خرداد، ۰۹:۱۵",
      "بسته شده",
      "green",
    ],
  ];
  const allIncidents = [...incidentRows, ...incidents];
  const visibleIncidents = allIncidents.filter((row) => {
    const matchesQuery = normalizeSearch(row.join(" ")).includes(
      normalizeSearch(query),
    );
    const matchesStatus =
      incidentFilter === "همه وضعیت‌ها" || row[5] === incidentFilter;
    return matchesQuery && matchesStatus;
  });
  return (
    <div className="app">
      <aside className={`sidebar ${mobile ? "opened" : ""}`}>
        <div className="brand">
          <div className="brand-mark">
            <ShieldCheck size={23} />
          </div>
          <div>
            <b>
              کارن <span>HSE</span>
            </b>
            <small>سامانه مدیریت ایمنی</small>
          </div>
          <button
            className="close-menu"
            type="button"
            aria-label="بستن فهرست"
            onClick={() => setMobile(false)}
          >
            <X size={19} />
          </button>
        </div>
        <div className="tenant">
          <div className="tenant-logo">ن</div>
          <div className="tenant-info">
            <b>گروه صنعتی نیکان</b>
            <small>
              <span className="online-dot" /> فضای کاری فعال
            </small>
          </div>
          <ChevronDown size={16} className="muted" />
        </div>
        <div className="nav-label">فضای کاری</div>
        <nav>
          {nav.map(({ name, icon: Icon, badge }) => (
            <button
              key={name}
              className={`nav-item ${active === name ? "selected" : ""}`}
              aria-current={active === name ? "page" : undefined}
              onClick={() => {
                setActive(name);
                setMobile(false);
                setMobileSearchOpen(false);
              }}
            >
              <Icon size={18} />
              <span>{name}</span>
              {badge && <i>{badge}</i>}
            </button>
          ))}
        </nav>
        <div className="nav-label management-label">مدیریت</div>
        <nav>
          <button
            className={`nav-item ${active === "تنظیمات سازمان" ? "selected" : ""}`}
            aria-current={active === "تنظیمات سازمان" ? "page" : undefined}
            onClick={() => {
              setActive("تنظیمات سازمان");
              setMobile(false);
              setMobileSearchOpen(false);
            }}
          >
            <Settings size={18} />
            <span>تنظیمات سازمان</span>
          </button>
          <button
            className={`nav-item ${active === "راهنما و پشتیبانی" ? "selected" : ""}`}
            aria-current={active === "راهنما و پشتیبانی" ? "page" : undefined}
            onClick={() => {
              setActive("راهنما و پشتیبانی");
              setMobile(false);
              setMobileSearchOpen(false);
            }}
          >
            <ScanLine size={18} />
            <span>راهنما و پشتیبانی</span>
          </button>
        </nav>
        {!isInstalled && (
          <button
            className="btn pwa-install"
            type="button"
            onClick={installApp}
          >
            <Smartphone size={16} />
            <span>نصب اپلیکیشن روی دستگاه</span>
          </button>
        )}
        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon">
              <Activity size={17} />
            </div>
            <b>همه‌چیز تحت کنترله</b>
            <p>
              وضعیت ایمنی سازمان شما
              <br />
              در یک نگاه
            </p>
            <div className="help-progress">
              <span />
            </div>
            <small>
              امتیاز انطباق <strong>۸۶٪</strong>
            </small>
          </div>
          <div className="profile">
            <div className="avatar">م</div>
            <div>
              <b>مریم احمدی</b>
              <small>مدیر HSE</small>
            </div>
            <MoreHorizontal size={19} className="muted" />
          </div>
          <div className="powered">
            طراحی و توسعه <b>کارن سافت</b>
            <span> · karen-soft.ir</span>
          </div>
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <button
            className="hamburger"
            type="button"
            aria-label="باز کردن فهرست"
            aria-expanded={mobile}
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <div className="breadcrumbs">
            <span>فضای کاری</span>
            <b>/</b>
            <strong>{active}</strong>
          </div>
          <div className="top-actions">
            <div className={`search ${mobileSearchOpen ? "expanded" : ""}`}>
              <button
                className="search-trigger"
                type="button"
                aria-label={mobileSearchOpen ? "بستن جستجو" : "جستجو"}
                aria-expanded={mobileSearchOpen}
                onClick={() => {
                  const next = !mobileSearchOpen;
                  setMobileSearchOpen(next);
                  if (next)
                    requestAnimationFrame(() => searchRef.current?.focus());
                  else searchRef.current?.blur();
                }}
              >
                <Search size={17} />
              </button>
              <input
                ref={searchRef}
                aria-label={`جستجو در ${active === "نمای کلی" ? "رخدادهای اخیر" : active}`}
                placeholder={`جستجو در ${active === "نمای کلی" ? "رخدادهای اخیر" : active}...`}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query && (
                <button
                  className="search-clear"
                  type="button"
                  aria-label="پاک‌کردن جستجو"
                  onClick={() => {
                    setQuery("");
                    searchRef.current?.focus();
                  }}
                >
                  <X size={14} />
                </button>
              )}
              <kbd>⌘ K</kbd>
            </div>
            <button
              className="icon-button notification"
              type="button"
              aria-label="اعلان‌ها"
              onClick={() => notify("اعلان جدیدی ندارید")}
            >
              <Bell size={19} />
            </button>
            <div className="top-divider" />
            <div className="user-chip" aria-label="کاربر نمایشی: مریم احمدی">
              <div className="avatar small">م</div>
              <span>
                <b>مریم احمدی</b>
                <small>مدیر HSE</small>
              </span>
              <ChevronDown size={15} aria-hidden="true" />
            </div>
          </div>
        </header>
        <div className="content">
          <Workspace
            key={active}
            active={active}
            globalQuery={query}
            onNotify={notify}
          />
          <div style={{ display: active === "نمای کلی" ? "block" : "none" }}>
            <div className="welcome-row">
              <div>
                <div className="eyebrow">
                  <span className="online-dot" /> {dateLabel} · پیش‌نمایش محلی
                </div>
                <h1>
                  {greeting}، مریم
                  <span className="wave" aria-hidden="true">
                    ✳
                  </span>
                </h1>
                <p>وضعیت ایمنی سازمان را بررسی کنید و برای بهبود اقدام کنید.</p>
              </div>
              <div className="head-buttons">
                <button
                  className="btn secondary"
                  onClick={() => exportDashboardReport(allIncidents)}
                >
                  <Download size={16} /> دریافت گزارش
                </button>
                <button
                  className="btn primary"
                  onClick={() => setShowModal(true)}
                >
                  <Plus size={18} /> ثبت گزارش جدید
                </button>
              </div>
            </div>
            <div className="summary-strip">
              <div className="summary-icon">
                <MapPin size={16} />
              </div>
              <span>نمایش اطلاعات</span>
              <strong>همه پروژه‌ها</strong>
              <span className="strip-separator" />
              <span>دوره</span>
              <button
                className="period-select"
                onClick={() =>
                  setPeriod(
                    period === "۳۰ روز گذشته" ? "۷ روز گذشته" : "۳۰ روز گذشته",
                  )
                }
              >
                <CalendarDays size={15} />
                {period}
                <ChevronDown size={14} />
              </button>
              <div className="strip-spacer" />
              <span className={`updated ${online ? "" : "offline"}`}>
                <span className="online-dot" />
                {online
                  ? "آنلاین · ذخیره روی همین دستگاه"
                  : "آفلاین · ذخیره محلی فعال"}
              </span>
            </div>
            <div className="section-heading">
              <div>
                <h2>نمای کلی عملکرد</h2>
                <p>
                  شاخص‌های نمایشی · رخدادهای ثبت‌شده روی دستگاه شما نیز همگام
                  می‌شوند
                </p>
              </div>
              <button
                className="text-button"
                onClick={() => setActive("گزارش‌ها")}
              >
                مشاهده گزارش کامل <ArrowUpLeft size={15} />
              </button>
            </div>
            <div className="kpi-grid">
              <Kpi
                title="روزهای بدون حادثه"
                value="۱۲۸"
                unit="روز"
                change="۱۲ روز بیشتر"
                positive
                icon={ShieldCheck}
                color="mint"
                foot="از آخرین حادثه منجر به آسیب"
              />
              <Kpi
                title="رخدادهای ثبت‌شده"
                value={allIncidents.length.toLocaleString("fa-IR", {
                  minimumIntegerDigits: 2,
                })}
                unit="مورد"
                change="داده نمونه"
                icon={TriangleAlert}
                color="peach"
                foot="نمونه نمایشی + ثبت‌های محلی"
              />
              <Kpi
                title="اقدامات باز"
                value="۱۸"
                unit="مورد"
                change="۴ مورد فوری"
                icon={ClipboardCheck}
                color="lavender"
                foot="نیازمند پیگیری و اقدام"
              />
              <Kpi
                title="نرخ انطباق ایمنی"
                value="۸۶"
                unit="٪"
                change="۵٪ رشد"
                positive
                icon={Activity}
                color="sky"
                foot="بر اساس ممیزی‌های اخیر"
              />
            </div>
            <div className="dashboard-grid">
              <section className="panel trend-panel">
                <div className="panel-heading">
                  <div>
                    <h3>روند حوادث و رخدادها</h3>
                    <p>مقایسه حوادث ثبت‌شده و شبه‌حوادث</p>
                  </div>
                  <button
                    className="select-small"
                    type="button"
                    aria-label="تغییر بازه نمودار"
                    onClick={() =>
                      setChartPeriod(
                        chartPeriod === "۶ ماه گذشته"
                          ? "۱۲ ماه گذشته"
                          : "۶ ماه گذشته",
                      )
                    }
                  >
                    {chartPeriod}
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div className="legend">
                  <span>
                    <i className="legend-dot coral" /> حوادث
                  </span>
                  <span>
                    <i className="legend-dot teal" /> شبه‌حوادث
                  </span>
                </div>
                <div className="chart">
                  <div className="y-labels">
                    <span>۲۰</span>
                    <span>۱۵</span>
                    <span>۱۰</span>
                    <span>۵</span>
                    <span>۰</span>
                  </div>
                  <div className="chart-area">
                    <div className="grid-lines">
                      <i />
                      <i />
                      <i />
                      <i />
                      <i />
                    </div>
                    <svg
                      viewBox="0 0 700 180"
                      preserveAspectRatio="none"
                      className="graph"
                    >
                      <defs>
                        <linearGradient
                          id="fillTeal"
                          x1="0"
                          x2="0"
                          y1="0"
                          y2="1"
                        >
                          <stop
                            offset="0"
                            stopColor="#159b83"
                            stopOpacity=".19"
                          />
                          <stop
                            offset="1"
                            stopColor="#159b83"
                            stopOpacity="0"
                          />
                        </linearGradient>
                      </defs>
                      <path
                        d="M0 118 C45 105 60 115 100 95 S155 101 200 77 S255 93 300 68 S355 86 400 58 S455 67 500 50 S555 66 600 34 S650 45 700 24 L700 180 L0 180Z"
                        fill="url(#fillTeal)"
                      />
                      <path
                        d="M0 118 C45 105 60 115 100 95 S155 101 200 77 S255 93 300 68 S355 86 400 58 S455 67 500 50 S555 66 600 34 S650 45 700 24"
                        fill="none"
                        stroke="#159b83"
                        strokeWidth="3"
                        vectorEffect="non-scaling-stroke"
                      />
                      <path
                        d="M0 145 C45 138 60 145 100 130 S155 137 200 124 S255 130 300 111 S355 125 400 112 S455 117 500 104 S555 113 600 91 S650 103 700 83"
                        fill="none"
                        stroke="#f08a72"
                        strokeWidth="2.5"
                        strokeDasharray="5 5"
                        vectorEffect="non-scaling-stroke"
                      />
                    </svg>
                    <div className="x-labels">
                      <span>دی</span>
                      <span>بهمن</span>
                      <span>اسفند</span>
                      <span>فروردین</span>
                      <span>اردیبهشت</span>
                      <span>خرداد</span>
                    </div>
                  </div>
                </div>
                <div className="chart-summary">
                  <div>
                    <span className="mini-icon green">
                      <ArrowDownLeft size={15} />
                    </span>
                    <b>۲۵٪</b>
                    <small>کاهش حوادث نسبت به دوره قبل</small>
                  </div>
                  <div className="chart-total">
                    <small>مجموع رخدادها</small>
                    <b>
                      ۴۲ <span>مورد</span>
                    </b>
                  </div>
                </div>
              </section>
              <section className="panel actions-panel">
                <div className="panel-heading">
                  <div>
                    <h3>اقدامات نیازمند پیگیری</h3>
                    <p>کارهایی که در اولویت شما هستند</p>
                  </div>
                  <button
                    className="dots"
                    onClick={() => notify("گزینه‌های بیشتر")}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <div className="action-list">
                  <Action
                    icon={TriangleAlert}
                    color="red"
                    title="بررسی گزارش شبه‌حادثه"
                    subtitle="پروژه برج آریا · INC-۲۴۸"
                    deadline="امروز"
                    urgent
                  />
                  <Action
                    icon={ClipboardCheck}
                    color="amber"
                    title="بستن اقدام اصلاحی"
                    subtitle="کارخانه تولید · CAPA-۰۸۲"
                    deadline="۲ روز مانده"
                  />
                  <Action
                    icon={GraduationCap}
                    color="blue"
                    title="تمدید گواهی‌نامه اپراتورها"
                    subtitle="واحد لجستیک · ۶ نفر"
                    deadline="۵ روز مانده"
                  />
                  <Action
                    icon={HardHat}
                    color="purple"
                    title="بازبینی ارزیابی ریسک"
                    subtitle="پروژه پارس جنوبی · RA-۰۱۹"
                    deadline="۷ روز مانده"
                  />
                </div>
                <button
                  className="all-actions"
                  onClick={() => setActive("اقدامات اصلاحی")}
                >
                  مشاهده همه اقدامات <ArrowUpLeft size={15} />
                </button>
              </section>
            </div>
            <div className="section-heading incidents-title">
              <div>
                <h2>آخرین رخدادها</h2>
                <p>گزارش‌های اخیر از تمام پروژه‌ها</p>
              </div>
              <div className="table-tools">
                <label className="table-filter">
                  <Filter size={15} aria-hidden="true" />
                  <select
                    aria-label="فیلتر رخدادها بر اساس وضعیت"
                    value={incidentFilter}
                    onChange={(event) => setIncidentFilter(event.target.value)}
                  >
                    <option>همه وضعیت‌ها</option>
                    <option>در حال بررسی</option>
                    <option>اقدام اصلاحی</option>
                    <option>بسته شده</option>
                  </select>
                </label>
                <button
                  className="text-button"
                  onClick={() => setActive(INCIDENTS_MODULE)}
                >
                  مشاهده همه <ArrowUpLeft size={15} />
                </button>
              </div>
            </div>
            <div className="panel table-panel">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>شناسه</th>
                      <th>نوع رخداد</th>
                      <th>عنوان و محل</th>
                      <th>تاریخ ثبت</th>
                      <th>وضعیت</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleIncidents.slice(0, 5).map((r) => (
                      <tr key={r[0]}>
                        <td>
                          <span className="id-text">{r[0]}</span>
                        </td>
                        <td>
                          <span
                            className={`type-dot ${r[6] === "orange" ? "orange-dot" : r[6] === "blue" ? "blue-dot" : "green-dot"}`}
                          />
                          {r[1]}
                        </td>
                        <td>
                          <b className="incident-name">{r[2]}</b>
                          <small className="location">{r[3]}</small>
                        </td>
                        <td className="date-cell">
                          <Clock3 size={14} />
                          {r[4]}
                        </td>
                        <td>
                          <span className={`status ${r[6]}`}>{r[5]}</span>
                        </td>
                        <td>
                          <button
                            className="dots row-dots"
                            type="button"
                            aria-label={`جزئیات رخداد ${r[0]}`}
                            title="نمایش خلاصه رخداد"
                            onClick={() => notify(`${r[2]} · ${r[5]}`)}
                          >
                            <MoreHorizontal size={19} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {visibleIncidents.length === 0 && (
                  <div className="empty">موردی با این عبارت پیدا نشد.</div>
                )}
              </div>
              <div className="table-footer">
                <span>
                  نمایش{" "}
                  {Math.min(visibleIncidents.length, 5).toLocaleString("fa-IR")}{" "}
                  از {visibleIncidents.length.toLocaleString("fa-IR")} رخداد
                </span>
                <button onClick={() => setActive(INCIDENTS_MODULE)}>
                  رفتن به فهرست رخدادها <ArrowUpLeft size={14} />
                </button>
              </div>
            </div>
            <div className="bottom-grid">
              <div className="panel projects-panel">
                <div className="panel-heading">
                  <div>
                    <h3>وضعیت پروژه‌ها</h3>
                    <p>شاخص ایمنی در سایت‌های فعال</p>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => setActive("مدیریت پروژه‌ها")}
                  >
                    همه پروژه‌ها
                  </button>
                </div>
                <div className="project-row">
                  <div className="project-avatar green-bg">
                    <Building2 size={17} />
                  </div>
                  <div className="project-detail">
                    <b>برج مسکونی آریا</b>
                    <small>تهران · ۲۴۸ نفر</small>
                  </div>
                  <div className="score">
                    <span>۹۲</span>
                    <small>امتیاز</small>
                  </div>
                  <div className="progress-line">
                    <i style={{ width: "92%" }} />
                  </div>
                  <span className="project-state good">عالی</span>
                </div>
                <div className="project-row">
                  <div className="project-avatar blue-bg">
                    <BriefcaseBusiness size={17} />
                  </div>
                  <div className="project-detail">
                    <b>کارخانه تولید نیکان</b>
                    <small>قزوین · ۱۸۶ نفر</small>
                  </div>
                  <div className="score">
                    <span>۸۴</span>
                    <small>امتیاز</small>
                  </div>
                  <div className="progress-line">
                    <i style={{ width: "84%" }} />
                  </div>
                  <span className="project-state good">خوب</span>
                </div>
                <div className="project-row">
                  <div className="project-avatar orange-bg">
                    <Leaf size={17} />
                  </div>
                  <div className="project-detail">
                    <b>پروژه پارس جنوبی</b>
                    <small>عسلویه · ۳۱۲ نفر</small>
                  </div>
                  <div className="score">
                    <span>۷۱</span>
                    <small>امتیاز</small>
                  </div>
                  <div className="progress-line warning">
                    <i style={{ width: "71%" }} />
                  </div>
                  <span className="project-state watch">نیازمند توجه</span>
                </div>
              </div>
              <div className="panel compliance-panel">
                <div className="panel-heading">
                  <div>
                    <h3>آمادگی انطباق</h3>
                    <p>وضعیت استانداردهای کلیدی</p>
                  </div>
                  <button
                    className="dots"
                    onClick={() => notify("جزئیات انطباق")}
                  >
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <div className="compliance-content">
                  <div className="donut">
                    <div>
                      <b>۸۶٪</b>
                      <small>میانگین</small>
                    </div>
                  </div>
                  <div className="standard-list">
                    <div>
                      <span>
                        <i className="std-dot" />
                        ISO 45001
                      </span>
                      <b>۹۲٪</b>
                    </div>
                    <div>
                      <span>
                        <i className="std-dot two" />
                        ISO 14001
                      </span>
                      <b>۸۴٪</b>
                    </div>
                    <div>
                      <span>
                        <i className="std-dot three" />
                        ISO 9001
                      </span>
                      <b>۸۱٪</b>
                    </div>
                  </div>
                </div>
                <div className="compliance-note">
                  <CheckCircle2 size={15} /> ۱۲ مورد تا انطباق کامل باقی‌مانده
                </div>
              </div>
            </div>
            <footer>
              <span>
                ©{" "}
                {new Intl.DateTimeFormat("fa-IR", { year: "numeric" }).format(
                  currentDate,
                )}{" "}
                کارن سافت · تمامی حقوق محفوظ است
              </span>
              <span>
                سامانه مدیریت یکپارچه HSE <i /> طراحی و توسعه با{" "}
                <b>کارن سافت</b>{" "}
                <span className="footer-url">karen-soft.ir</span>
              </span>
            </footer>
          </div>
        </div>
      </main>
      {mobile && <div className="backdrop" onClick={() => setMobile(false)} />}{" "}
      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {showModal && (
        <div className="modal-backdrop" onClick={closeReportModal}>
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-dialog-title"
            tabIndex={-1}
            ref={modalRef}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const focusable = [
                ...event.currentTarget.querySelectorAll(
                  "button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
                ),
              ];
              if (!focusable.length) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
              }
            }}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="بستن پنجره"
              onClick={closeReportModal}
            >
              <X size={18} />
            </button>
            <div className="modal-icon">
              <TriangleAlert size={21} />
            </div>
            <h2 id="report-dialog-title">{reportType || "ثبت گزارش جدید"}</h2>
            <p>
              {reportType
                ? "اطلاعات اولیه رخداد را وارد کنید."
                : "نوع گزارشی که می‌خواهید ثبت کنید را انتخاب کنید."}
            </p>
            {reportType ? (
              <form className="incident-form" onSubmit={saveDashboardRecord}>
                <label>
                  {reportType === "بازرسی جدید"
                    ? "عنوان بازرسی"
                    : "عنوان گزارش"}
                  <input
                    name="title"
                    required
                    autoFocus
                    maxLength="120"
                    placeholder="برای نمونه: لغزش در مسیر تردد"
                  />
                </label>
                <label>
                  پروژه / محل وقوع
                  <input
                    name="site"
                    required
                    placeholder="برای نمونه: پروژه آریا، طبقه ۲"
                  />
                </label>
                <label>
                  شرح مختصر
                  <textarea
                    name="description"
                    rows="3"
                    placeholder="شرح کوتاه اتفاق یا مشاهده..."
                  />
                </label>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => setReportType("")}
                  >
                    بازگشت
                  </button>
                  <button type="submit" className="btn primary">
                    <CheckCircle2 size={16} /> ثبت گزارش
                  </button>
                </div>
              </form>
            ) : (
              <div className="report-options">
                {[
                  ["گزارش حادثه", TriangleAlert],
                  ["بازرسی جدید", ClipboardCheck],
                  ["گزارش شبه‌حادثه", Activity],
                  ["اقدام اصلاحی", ShieldCheck],
                ].map(([n, I]) => (
                  <button key={n} onClick={() => setReportType(n)}>
                    <I size={19} />
                    <span>{n}</span>
                    <ArrowUpLeft size={15} />
                  </button>
                ))}
              </div>
            )}
            <div className="modal-brand">
              طراحی و توسعه <b>کارن سافت</b>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function Workspace({ active, globalQuery, onNotify }) {
  const configs = {
    "حوادث و رخدادها": {
      singular: "گزارش رخداد",
      noun: "رخداد",
      fields: ["عنوان رخداد", "پروژه / محل", "گزارش‌دهنده"],
    },
    بازرسی‌ها: {
      singular: "بازرسی",
      noun: "بازرسی",
      fields: ["عنوان بازرسی", "پروژه / محل", "بازرس"],
    },
    "اقدامات اصلاحی": {
      singular: "اقدام اصلاحی",
      noun: "اقدام",
      fields: ["عنوان اقدام", "پروژه / محل", "مسئول اقدام"],
    },
    "ارزیابی ریسک": {
      singular: "ارزیابی ریسک",
      noun: "ارزیابی",
      fields: ["عنوان خطر / ارزیابی", "پروژه / محل", "ارزیاب"],
    },
    "مدیریت پروژه‌ها": {
      singular: "پروژه",
      noun: "پروژه",
      fields: ["نام پروژه", "شهر / محل", "مدیر پروژه"],
    },
    "کارکنان و آموزش": {
      singular: "دوره / پرونده آموزشی",
      noun: "پرونده",
      fields: ["عنوان دوره / گواهی", "واحد / محل", "کارمند / مدرس"],
    },
    گزارش‌ها: {
      singular: "گزارش دوره‌ای",
      noun: "گزارش",
      fields: ["عنوان گزارش", "پروژه / بازه", "تهیه‌کننده"],
    },
    "تنظیمات سازمان": {
      singular: "واحد سازمانی",
      noun: "واحد",
      fields: ["نام واحد", "محل / پروژه", "مدیر واحد"],
    },
    "راهنما و پشتیبانی": {
      singular: "درخواست پشتیبانی",
      noun: "درخواست",
      fields: ["موضوع درخواست", "بخش مرتبط", "درخواست‌دهنده"],
    },
  };
  const cfg = configs[active];
  const key = "karen-hse-records-v1-" + active;
  const [rows, setRows] = useState(() =>
    readArray(key).filter(
      (record) => record && typeof record.title === "string",
    ),
  );
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("همه وضعیت‌ها");
  const [form, setForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const refresh = (event) => {
      if (!event.key || event.key === key) {
        setRows(
          readArray(key).filter(
            (record) => record && typeof record.title === "string",
          ),
        );
      }
    };
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [key]);
  if (!cfg) return null;
  function persist(next) {
    if (!writeArray(key, next)) {
      const message =
        "فضای ذخیره‌سازی مرورگر در دسترس نیست. خروجی پشتیبان تهیه کنید.";
      setError(message);
      onNotify(message);
      return false;
    }
    setRows(next);
    setError("");
    if (active === INCIDENTS_MODULE) {
      window.dispatchEvent(new Event("karen-hse:incidents-updated"));
    }
    return true;
  }
  function openNew() {
    setEditingId(null);
    setError("");
    setForm(true);
  }
  function startEdit(row) {
    setEditingId(row.id);
    setError("");
    setForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function add(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") || "").trim();
    if (!title) {
      setError("عنوان را وارد کنید");
      return;
    }
    const now = new Date();
    const old = rows.find((record) => record.id === editingId);
    const prefix = active === INCIDENTS_MODULE ? "INC" : "HSE";
    const row = {
      ...(old || {}),
      id: old?.id || makeId(),
      code:
        old?.code || `${prefix}-${String(rows.length + 1).padStart(3, "0")}`,
      kind: old?.kind || cfg.singular,
      title,
      location: String(formData.get("location") || "").trim(),
      owner: String(formData.get("owner") || "").trim(),
      priority: String(formData.get("priority") || "متوسط"),
      description: String(formData.get("description") || "").trim(),
      dueDate: String(formData.get("dueDate") || ""),
      status: String(formData.get("status") || old?.status || "جدید"),
      date: old?.date || formatFaDate(now),
      updated: now.toISOString(),
      created: old?.created || now.toISOString(),
    };
    const next = old
      ? rows.map((record) => (record.id === old.id ? row : record))
      : [row, ...rows];
    if (!persist(next)) return;
    setForm(false);
    setEditingId(null);
    setError("");
    onNotify(old ? "تغییرات ذخیره شد" : "مورد جدید در همین دستگاه ذخیره شد");
  }
  function remove(id) {
    if (
      window.confirm(
        "این مورد از همین مرورگر حذف شود؟ این کار قابل بازگشت نیست.",
      )
    ) {
      if (persist(rows.filter((record) => record.id !== id))) {
        onNotify("مورد از فضای محلی حذف شد");
      }
    }
  }
  function cycle(id) {
    persist(
      rows.map((r) =>
        r.id === id
          ? {
              ...r,
              status:
                r.status === "جدید"
                  ? "در حال پیگیری"
                  : r.status === "در حال پیگیری"
                    ? "بسته شده"
                    : "جدید",
            }
          : r,
      ),
    );
  }
  function backup() {
    const payload = {
      product: "Karen HSE",
      module: active,
      exportedAt: new Date().toISOString(),
      records: rows,
    };
    downloadTextFile(
      JSON.stringify(payload, null, 2),
      `karen-hse-${Date.now()}.json`,
      "application/json",
    );
    onNotify("نسخه پشتیبان دانلود شد");
  }
  function exportCsv() {
    const escapeCsv = (value) =>
      `"${String(value ?? "").replaceAll('"', '""')}"`;
    const lines = [
      ["عنوان", "محل", "مسئول", "اولویت", "وضعیت", "مهلت", "شرح"],
      ...visible.map((record) => [
        record.title,
        record.location,
        record.owner,
        record.priority,
        record.status,
        record.dueDate,
        record.description,
      ]),
    ].map((row) => row.map(escapeCsv).join(","));
    downloadTextFile(
      `\ufeff${lines.join("\r\n")}`,
      `karen-hse-${Date.now()}.csv`,
      "text/csv;charset=utf-8",
    );
    onNotify("فایل CSV آماده دانلود است");
  }
  function restore(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(String(reader.result));
        if (data?.module && data.module !== active) {
          throw new Error("این نسخه پشتیبان مربوط به بخش دیگری است.");
        }
        const incoming = Array.isArray(data) ? data : data?.records;
        if (
          !Array.isArray(incoming) ||
          incoming.length > 10000 ||
          !incoming.every(
            (record) => record && typeof record.title === "string",
          )
        ) {
          throw new Error("ساختار فایل پشتیبان معتبر نیست.");
        }
        const merged = new Map(
          rows.map((record) => [String(record.id), record]),
        );
        incoming.forEach((record) => {
          const safeRecord = {
            id: String(record.id || makeId()),
            code: String(record.code || ""),
            kind: String(record.kind || cfg.singular),
            title: record.title.slice(0, 120),
            location: String(record.location || "").slice(0, 100),
            owner: String(record.owner || "").slice(0, 80),
            priority: String(record.priority || "متوسط"),
            description: String(record.description || "").slice(0, 1000),
            dueDate: String(record.dueDate || ""),
            status: ["جدید", "در حال پیگیری", "بسته شده"].includes(
              record.status,
            )
              ? record.status
              : "جدید",
            date: String(record.date || formatFaDate(new Date())),
            created: String(record.created || new Date().toISOString()),
            updated: new Date().toISOString(),
          };
          merged.set(safeRecord.id, safeRecord);
        });
        if (persist([...merged.values()])) onNotify("نسخه پشتیبان بازیابی شد");
      } catch (error) {
        onNotify(error.message || "فایل پشتیبان معتبر نیست");
      }
    };
    reader.onerror = () => onNotify("خواندن فایل پشتیبان ناموفق بود");
    reader.readAsText(file);
    event.target.value = "";
  }
  const localQuery = normalizeSearch(search);
  const pageQuery = normalizeSearch(globalQuery);
  const visible = rows.filter((record) => {
    const content = normalizeSearch(
      `${record.code || ""} ${record.kind || ""} ${record.title} ${record.location || ""} ${record.owner || ""} ${record.description || ""} ${record.status || ""} ${record.priority || ""}`,
    );
    const matchesLocalSearch = !localQuery || content.includes(localQuery);
    const matchesPageSearch = !pageQuery || content.includes(pageQuery);
    const matchesStatus = filter === "همه وضعیت‌ها" || record.status === filter;
    return matchesLocalSearch && matchesPageSearch && matchesStatus;
  });
  const hasActiveFilters = Boolean(
    localQuery || pageQuery || filter !== "همه وضعیت‌ها",
  );
  return (
    <div className="workspace">
      <div className="welcome-row workspace-welcome">
        <div>
          <div className="eyebrow">
            <span className="online-dot" /> فضای ذخیره‌سازی محلی این مرورگر
          </div>
          <h1>{active}</h1>
          <p>
            اطلاعات این بخش روی همین دستگاه ذخیره می‌شود و بین کاربران یا
            دستگاه‌ها همگام نیست.
          </p>
        </div>
        <div className="head-buttons">
          <button className="btn secondary" onClick={backup}>
            <Download size={15} /> پشتیبان‌گیری JSON
          </button>
          <label className="btn secondary import-btn">
            بازیابی نسخه
            <input
              type="file"
              accept="application/json,.json"
              onChange={restore}
            />
          </label>
          <button
            className="btn primary"
            onClick={() => (form ? setForm(false) : openNew())}
          >
            <Plus size={17} />
            {cfg.singular} جدید
          </button>
        </div>
      </div>
      <div className="storage-warning">
        <ShieldCheck size={17} />
        <span>
          <b>حالت محلی و آزمایشی</b> · پاک‌کردن داده‌های مرورگر باعث حذف رکوردها
          می‌شود. از «پشتیبان‌گیری JSON» برای نگهداری نسخه پشتیبان استفاده کنید.
        </span>
      </div>
      <div className="workspace-stats">
        <div>
          <small>کل {cfg.noun}‌ها</small>
          <b>{rows.length.toLocaleString("fa-IR")}</b>
        </div>
        <div>
          <small>جدید</small>
          <b>
            {rows
              .filter((r) => r.status === "جدید")
              .length.toLocaleString("fa-IR")}
          </b>
        </div>
        <div>
          <small>در حال پیگیری</small>
          <b>
            {rows
              .filter((r) => r.status === "در حال پیگیری")
              .length.toLocaleString("fa-IR")}
          </b>
        </div>
        <div>
          <small>بسته‌شده</small>
          <b>
            {rows
              .filter((r) => r.status === "بسته شده")
              .length.toLocaleString("fa-IR")}
          </b>
        </div>
      </div>
      {form && (
        <div className="panel create-panel">
          <div className="panel-heading">
            <div>
              <h3>
                {editingId ? "ویرایش" : "ثبت"} {cfg.singular}
              </h3>
              <p>اطلاعات این فرم فقط در همین مرورگر ذخیره می‌شود.</p>
            </div>
            <button
              className="dots"
              onClick={() => {
                setForm(false);
                setEditingId(null);
              }}
            >
              <X size={18} />
            </button>
          </div>
          <form key={editingId || "new"} className="record-form" onSubmit={add}>
            <label>
              {cfg.fields[0]} *
              <input
                name="title"
                required
                maxLength="120"
                defaultValue={rows.find((r) => r.id === editingId)?.title || ""}
                placeholder="عنوان را وارد کنید"
              />
            </label>
            <label>
              {cfg.fields[1]}
              <input
                name="location"
                maxLength="100"
                defaultValue={
                  rows.find((r) => r.id === editingId)?.location || ""
                }
                placeholder="محل یا پروژه"
              />
            </label>
            <label>
              {cfg.fields[2]}
              <input
                name="owner"
                maxLength="80"
                defaultValue={rows.find((r) => r.id === editingId)?.owner || ""}
                placeholder="نام مسئول"
              />
            </label>
            <label>
              اولویت
              <select
                name="priority"
                defaultValue={
                  rows.find((r) => r.id === editingId)?.priority || "متوسط"
                }
              >
                <option>متوسط</option>
                <option>بالا</option>
                <option>بحرانی</option>
                <option>پایین</option>
              </select>
            </label>
            <label>
              مهلت انجام
              <input
                name="dueDate"
                type="date"
                defaultValue={
                  rows.find((r) => r.id === editingId)?.dueDate || ""
                }
              />
            </label>
            <label>
              وضعیت
              <select
                name="status"
                defaultValue={
                  rows.find((r) => r.id === editingId)?.status || "جدید"
                }
              >
                <option>جدید</option>
                <option>در حال پیگیری</option>
                <option>بسته شده</option>
              </select>
            </label>
            <label className="wide-field">
              شرح / یادداشت
              <textarea
                name="description"
                rows="3"
                maxLength="1000"
                defaultValue={
                  rows.find((r) => r.id === editingId)?.description || ""
                }
                placeholder="شرح تکمیلی، یافته‌ها یا اقدامات لازم..."
              />
            </label>
            <div className="form-end">
              {error && <span>{error}</span>}
              <button
                type="button"
                className="btn secondary"
                onClick={() => {
                  setForm(false);
                  setEditingId(null);
                }}
              >
                انصراف
              </button>
              <button className="btn primary" type="submit">
                <CheckCircle2 size={15} />
                {editingId ? "ذخیره تغییرات" : "ذخیره در مرورگر"}
              </button>
            </div>
          </form>
        </div>
      )}
      <section className="panel records-panel">
        <div className="records-heading">
          <div>
            <h3>فهرست {cfg.noun}‌ها</h3>
            <p>{visible.length.toLocaleString("fa-IR")} مورد در این مرورگر</p>
          </div>
          <div className="record-tools">
            <div className="record-search">
              <Search size={15} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="جستجو در فهرست"
              />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option>همه وضعیت‌ها</option>
              <option>جدید</option>
              <option>در حال پیگیری</option>
              <option>بسته شده</option>
            </select>
            <button
              className="btn secondary export-csv"
              onClick={exportCsv}
              disabled={!visible.length}
            >
              <Download size={14} /> CSV
            </button>
          </div>
        </div>
        {visible.length ? (
          <div className="record-list">
            {visible.map((r) => (
              <div className="record-row" key={r.id}>
                <div className="record-mark">
                  <ClipboardCheck size={17} />
                </div>
                <div className="record-main">
                  <b>{r.title}</b>
                  <small>
                    {r.location || "محل ثبت نشده"}
                    {r.owner ? " · مسئول: " + r.owner : ""}
                    {r.dueDate ? " · مهلت: " + r.dueDate : ""}
                  </small>
                  {r.description && (
                    <small className="record-description">
                      {r.description}
                    </small>
                  )}
                </div>
                <span
                  className={
                    "priority " +
                    (r.priority === "بحرانی"
                      ? "critical"
                      : r.priority === "بالا"
                        ? "high"
                        : "")
                  }
                >
                  {r.priority}
                </span>
                <button
                  className={
                    "record-status " + (r.status === "بسته شده" ? "done" : "")
                  }
                  onClick={() => cycle(r.id)}
                  title="برای تغییر وضعیت کلیک کنید"
                  aria-label={`تغییر وضعیت ${r.title}، وضعیت فعلی ${r.status}`}
                >
                  {r.status}
                </button>
                <small className="record-date">{r.date}</small>
                <button
                  className="edit-record"
                  onClick={() => startEdit(r)}
                  aria-label="ویرایش رکورد"
                  title="ویرایش"
                >
                  ✎
                </button>
                <button
                  className="delete-record"
                  onClick={() => remove(r.id)}
                  aria-label="حذف رکورد"
                  title="حذف"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="workspace-empty">
            <div>
              <ClipboardCheck size={24} />
            </div>
            <b>
              {hasActiveFilters
                ? "موردی پیدا نشد"
                : `هنوز ${cfg.noun}ی ثبت نشده است`}
            </b>
            <p>
              {hasActiveFilters
                ? "عبارت جستجو را تغییر دهید یا فیلتر را بردارید."
                : "با ثبت اولین مورد، فهرست شخصی این بخش را بسازید."}
            </p>
            {!hasActiveFilters && (
              <button className="btn primary" onClick={openNew}>
                <Plus size={16} /> ثبت {cfg.singular}
              </button>
            )}
          </div>
        )}
      </section>
      <div className="workspace-foot">
        داده‌های این بخش در فضای محلی مرورگر نگهداری می‌شوند؛ خروجی JSON را در
        محل امن نگه دارید. <b>کارن سافت</b> · karen-soft.ir
      </div>
    </div>
  );
}
function Kpi({
  title,
  value,
  unit,
  change,
  positive,
  icon: Icon,
  color,
  foot,
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-top">
        <div className={`kpi-icon ${color}`}>
          <Icon size={19} />
        </div>
        <span className="dots" aria-hidden="true">
          <MoreHorizontal size={19} />
        </span>
      </div>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">
        {value}
        <small>{unit}</small>
      </div>
      <div className="kpi-foot">
        <span className={`change ${positive ? "pos" : ""}`}>
          {positive && <ArrowUpLeft size={13} />} {change}
        </span>
        <span>{foot}</span>
      </div>
      <div className="sparkline">
        <svg viewBox="0 0 100 24" preserveAspectRatio="none">
          <path
            d="M0 18 C10 15 12 20 23 12 S38 16 49 10 S61 13 70 7 S84 11 100 3"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
}
function Action({ icon: Icon, color, title, subtitle, deadline, urgent }) {
  return (
    <div className="action-item">
      <div className={`action-icon ${color}`}>
        <Icon size={17} />
      </div>
      <div className="action-main">
        <b>{title}</b>
        <small>{subtitle}</small>
      </div>
      <span className={`deadline ${urgent ? "urgent" : ""}`}>
        {urgent && <i />}
        {deadline}
      </span>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
