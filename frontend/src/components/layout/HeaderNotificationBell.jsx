import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink, Clock } from 'lucide-react';
import { notificationApi } from '../../api/notification.api';

function formatRelativeTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}j lalu`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}h lalu`;
}

export default function HeaderNotificationBell() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await notificationApi.getNotifications({ limit: 15 });
      setNotifications(res.data || []);
      setUnreadCount(res.unread_count || 0);
    } catch (err) {
      console.error('Gagal memuat notifikasi:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Polling berkala setiap 60 detik untuk pembaruan notifikasi
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Handle klik di luar untuk menutup dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (item) => {
    try {
      if (!item.is_read) {
        await notificationApi.markAsRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
      setIsOpen(false);
      if (item.link) {
        navigate(item.link);
      }
    } catch (err) {
      console.error('Gagal menandai notifikasi dibaca:', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Gagal menandai semua notifikasi dibaca:', err.message);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-lg text-[#5E6070] hover:text-[#1F2233] hover:bg-[#FAF7F2] border border-transparent hover:border-[#E6E0D6] transition cursor-pointer select-none"
        title="Pusat Notifikasi"
        aria-label="Notifikasi"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-[#8A1F1B] text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-[#E6E0D6] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          {/* Header Popover */}
          <div className="px-4 py-3 bg-[#FAF7F2] border-b border-[#E6E0D6] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#1F2233]">Notifikasi</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[#8A1F1B]/10 text-[#8A1F1B] rounded-full text-[10px] font-bold">
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-[11px] font-semibold text-[#3D4E9C] hover:underline cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* List Notifikasi */}
          <div className="max-h-80 overflow-y-auto divide-y divide-[#F0EBE2]">
            {loading && notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#5E6070]">Memuat notifikasi...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#5E6070] space-y-1">
                <Bell className="w-6 h-6 mx-auto text-[#B9B4C9] mb-2" />
                <p className="font-semibold text-[#1F2233]">Tidak ada notifikasi</p>
                <p className="text-[11px]">Anda akan menerima pemberitahuan alur validasi dan deadline di sini.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item)}
                  className={`p-3.5 hover:bg-[#FAF7F2] transition cursor-pointer flex items-start gap-3 text-left ${
                    !item.is_read ? 'bg-[#ECE8F5]/30' : ''
                  }`}
                >
                  <div className="mt-1 shrink-0">
                    {!item.is_read ? (
                      <span className="w-2 h-2 rounded-full bg-[#3D4E9C] block" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-transparent block" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${!item.is_read ? 'font-bold text-[#1F2233]' : 'font-medium text-[#1F2233]'}`}>
                      {item.title}
                    </p>
                    <p className="text-[11px] text-[#5E6070] mt-0.5 line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[#5E6070]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-[#B9B4C9]" />
                        {formatRelativeTime(item.created_at)}
                      </span>
                      {item.link && (
                        <span className="text-[#3D4E9C] flex items-center gap-0.5">
                          Buka <ExternalLink className="w-2.5 h-2.5" />
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
