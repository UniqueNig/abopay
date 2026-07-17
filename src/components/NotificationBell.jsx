import React, { useEffect, useState } from "react";
import { FiBell } from "react-icons/fi";
import { api } from "../api";
import { formatDate } from "../utils/helpers";

const LAST_SEEN_KEY = "abopay_notifications_last_seen";

// Minimal broadcast-notification viewer — reads the same shared collection
// admins write to from Admin → Marketing → Notifications. "Unread" is
// tracked client-side (localStorage timestamp), not per-user server state,
// since there's no per-user read-tracking model for this yet.
const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    api
      .get("/notifications")
      .then((res) => {
        const list = res.notifications || [];
        setNotifications(list);
        const lastSeen = localStorage.getItem(LAST_SEEN_KEY);
        if (list[0] && (!lastSeen || new Date(list[0].createdAt) > new Date(lastSeen))) {
          setHasUnread(true);
        }
      })
      .catch(() => {});
  }, []);

  const toggle = () => {
    setOpen((o) => !o);
    if (!open) {
      setHasUnread(false);
      localStorage.setItem(LAST_SEEN_KEY, new Date().toISOString());
    }
  };

  return (
    <div className="relative">
      <button onClick={toggle} className="relative text-white/60 hover:text-white p-1.5">
        <FiBell size={19} />
        {hasUnread && <span className="absolute top-1 right-1 w-2 h-2 bg-secondary rounded-full" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 max-h-80 overflow-y-auto bg-[#0d2248] border border-white/15 rounded-xl shadow-2xl z-50">
            {notifications.length === 0 ? (
              <p className="text-white/35 font-dm text-xs text-center p-6">No notifications yet.</p>
            ) : (
              notifications.map((n, i) => (
                <div key={n.id} className={`p-3.5 ${i < notifications.length - 1 ? "border-b border-white/8" : ""}`}>
                  <p className="text-white font-dm text-sm font-medium">{n.title}</p>
                  <p className="text-white/50 font-dm text-xs mt-0.5">{n.body}</p>
                  <p className="text-white/30 font-dm text-[11px] mt-1">{formatDate(n.createdAt)}</p>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
