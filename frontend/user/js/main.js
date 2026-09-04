/**
 * Main Frontend Logic for AVVC 2026 Public Website
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Mobile Menu Hamburger Toggle
    const hamburger = document.getElementById('hamburgerBtn');
    const navMenu = document.getElementById('navMenu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            navMenu.classList.toggle('active');
        });
    }

    // 2. Highlight Active Page Link
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        if (link.getAttribute('href') === currentPath || (currentPath === '/' && link.getAttribute('href') === 'index.html')) {
            link.classList.add('active');
        }
    });

    // 3. Immediately Start Countdown to Sep 14, 2026 by default
    if (document.getElementById('countdownGrid')) {
        startCountdown('2026-09-14');
    }

    // 4. Load Festival Settings globally
    loadGlobalSettings();

    // 5. Initialize Notification Bell
    initNotificationBell();

    // 6. Toast helper
    window.showToast = function (message, isError = false) {
        let toast = document.getElementById('appToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'appToast';
            document.body.appendChild(toast);
        }
        toast.textContent = message;
        if (isError) {
            toast.style.background = 'linear-gradient(135deg, #D32F2F, #B71C1C)';
            toast.style.color = '#FFF';
        } else {
            toast.style.background = 'linear-gradient(135deg, #FFD700, #FF8C00)';
            toast.style.color = '#200';
        }
        toast.classList.add('show');
        clearTimeout(toast._timer);
        toast._timer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3500);
    };
});

/* 6. Notifications Bell & Updates System */
async function loadNotifications() {
    try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        const badge = document.getElementById('notifBadge');
        const container = document.getElementById('notifListContainer');

        if (data.notifications && data.notifications.length > 0) {
            const lastSeenCount = localStorage.getItem('AVVC_NOTIF_READ_COUNT') || 0;
            const unreadCount = Math.max(0, data.notifications.length - parseInt(lastSeenCount));
            if (badge) {
                badge.textContent = unreadCount;
                badge.style.display = unreadCount > 0 ? 'inline-block' : 'none';
            }

            if (container) {
                container.innerHTML = data.notifications.map(n => {
                    let icon = '📢';
                    if (n.type === 'DONATION') icon = '🪔';
                    else if (n.type === 'EVENT') icon = '📅';
                    else if (n.type === 'FOOD') icon = '🍲';
                    else if (n.type === 'COMPETITION') icon = '🏆';

                    return `
                        <div style="padding:12px; margin-bottom:10px; background:#FFFBEB; border-left:4px solid var(--accent-crimson); border-radius:8px; font-size:0.9rem;">
                            <div style="font-weight:800; color:var(--accent-crimson); margin-bottom:4px;">${icon} ${n.title}</div>
                            <div style="color:var(--text-main); font-weight:500;">${n.message}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">${new Date(n.created_at || Date.now()).toLocaleString()}</div>
                        </div>
                    `;
                }).join('');
            }
        } else if (container) {
            container.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No notifications yet.</p>';
        }
    } catch(e){}
}

function initNotificationBell() {
    const bellBtn = document.getElementById('notifBellBtn');
    const drawer = document.getElementById('notifDrawer');
    const closeBtn = document.getElementById('closeNotifBtn');
    const clearBtn = document.getElementById('btnClearNotifBadge');

    if (bellBtn && drawer) {
        bellBtn.addEventListener('click', () => {
            drawer.style.display = drawer.style.display === 'none' || !drawer.style.display ? 'block' : 'none';
            loadNotifications();
        });
    }

    if (closeBtn && drawer) {
        closeBtn.addEventListener('click', () => { drawer.style.display = 'none'; });
    }

    if (drawer) {
        drawer.addEventListener('click', (e) => {
            if (e.target === drawer) drawer.style.display = 'none';
        });
    }

    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            fetch('/api/notifications')
                .then(r => r.json())
                .then(d => {
                    const count = d.notifications ? d.notifications.length : 999;
                    localStorage.setItem('AVVC_NOTIF_READ_COUNT', count);
                    const badge = document.getElementById('notifBadge');
                    if (badge) {
                        badge.textContent = '0';
                        badge.style.display = 'none';
                    }
                    clearBtn.textContent = '✓ All marked as read';
                    clearBtn.style.color = '#059669';
                    if (window.showToast) window.showToast('✓ All notifications marked as read');
                })
                .catch(() => {
                    localStorage.setItem('AVVC_NOTIF_READ_COUNT', 999);
                    const badge = document.getElementById('notifBadge');
                    if (badge) badge.style.display = 'none';
                });
        });
    }

    loadNotifications();
    setInterval(loadNotifications, 10000);
}

async function loadGlobalSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings) {
            window.AVVC_SETTINGS = data.settings;
            if (data.settings.festival_name) {
                document.querySelectorAll('.setting-fest-name').forEach(el => el.textContent = data.settings.festival_name);
            }
            if (data.settings.main_location) {
                document.querySelectorAll('.setting-location').forEach(el => el.textContent = data.settings.main_location);
            }
            if (data.settings.contact_number) {
                document.querySelectorAll('.setting-contact').forEach(el => el.textContent = data.settings.contact_number);
            }

            // Update Countdown target if custom date configured in settings
            if (document.getElementById('countdownGrid') && data.settings.festival_start_date) {
                startCountdown(data.settings.festival_start_date);
            }
        }
    } catch (err) {
        console.error('Settings load error:', err);
    }
}

let countdownInterval = null;

function startCountdown(targetDateStr) {
    if (countdownInterval) clearInterval(countdownInterval);

    // Parse date safely (YYYY-MM-DD)
    const parts = targetDateStr.split('-');
    let targetDate;
    if (parts.length === 3) {
        targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 0, 0, 0).getTime();
    } else {
        targetDate = new Date(targetDateStr).getTime();
    }

    if (isNaN(targetDate)) return;

    function update() {
        const now = new Date().getTime();
        const diff = targetDate - now;

        const daysEl = document.getElementById('cdDays');
        const hoursEl = document.getElementById('cdHours');
        const minsEl = document.getElementById('cdMins');
        const secsEl = document.getElementById('cdSecs');
        const titleEl = document.getElementById('countdownTitle');

        if (diff <= 0) {
            if (titleEl) titleEl.textContent = '🎉 FESTIVAL COMPLETED / IN PROGRESS 🎉';
            if (daysEl) daysEl.textContent = '00';
            if (hoursEl) hoursEl.textContent = '00';
            if (minsEl) minsEl.textContent = '00';
            if (secsEl) secsEl.textContent = '00';
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);

        if (daysEl) daysEl.textContent = String(days).padStart(2, '0');
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minsEl) minsEl.textContent = String(mins).padStart(2, '0');
        if (secsEl) secsEl.textContent = String(secs).padStart(2, '0');
    }

    update();
    countdownInterval = setInterval(update, 1000);
}
