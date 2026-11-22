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
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        style={{
          position: 'relative',
          padding: 8,
          borderRadius: 8,
          color: '#5E6070',
          background: 'transparent',
          border: '1px solid transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="Pusat Notifikasi"
        aria-label="Notifikasi"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            style={{
              position: 'absolute',
              top: -2,
              right: -2,
              minWidth: 18,
              height: 18,
              background: '#8A1F1B',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              borderRadius: 99,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: 0,
            marginTop: 8,
            width: 340,
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            border: '1px solid #E6E0D6',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {/* Header Popover */}
          <div
            style={{
              padding: '12px 16px',
              background: '#FAF7F2',
              borderBottom: '1px solid #E6E0D6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#1F2233' }}>Notifikasi</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    padding: '2px 6px',
                    background: 'rgba(138, 31, 27, 0.1)',
                    color: '#8A1F1B',
                    borderRadius: 99,
                    fontSize: 10,
                    fontWeight: 700,
                  }}
                >
                  {unreadCount} baru
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: '#3D4E9C',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <CheckCheck size={14} />
                Tandai semua dibaca
              </button>
            )}
          </div>

          {/* List Notifikasi */}
          <div style={{ maxHeight: 320, overflowY: 'auto' }}>
            {loading && notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: '#5E6070' }}>
                Memuat notifikasi...
              </div>
            ) : notifications.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', fontSize: 12, color: '#5E6070' }}>
                <Bell size={24} style={{ margin: '0 auto 8px', color: '#B9B4C9', display: 'block' }} />
                <p style={{ margin: 0, fontWeight: 600, color: '#1F2233' }}>Tidak ada notifikasi</p>
                <p style={{ margin: '4px 0 0', fontSize: 11 }}>
                  Anda akan menerima pemberitahuan alur validasi dan deadline di sini.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleMarkAsRead(item)}
                  style={{
                    padding: 12,
                    borderBottom: '1px solid #F0EBE2',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 12,
                    textAlign: 'left',
                    background: !item.is_read ? 'rgba(236, 232, 245, 0.35)' : '#fff',
                  }}
                >
                  <div style={{ marginTop: 4, flexShrink: 0 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: !item.is_read ? '#3D4E9C' : 'transparent',
                        display: 'block',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin: 0,
                        fontSize: 12,
                        fontWeight: !item.is_read ? 700 : 500,
                        color: '#1F2233',
                      }}
                    >
                      {item.title}
                    </p>
                    <p
                      style={{
                        margin: '2px 0 0',
                        fontSize: 11,
                        color: '#5E6070',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.body}
                    </p>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 6,
                        fontSize: 10,
                        color: '#5E6070',
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={12} style={{ color: '#B9B4C9' }} />
                        {formatRelativeTime(item.created_at)}
                      </span>
                      {item.link && (
                        <span
                          style={{
                            color: '#3D4E9C',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                          }}
                        >
                          Buka <ExternalLink size={10} />
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
