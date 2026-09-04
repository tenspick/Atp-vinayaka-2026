/**
 * Admin Dashboard Controller for ANANTHAMPALLI VILLAGE VINAYAKA CHAVITHI 2026
 * Clean White High-Contrast Theme with Collector Full Names & Official Receipt Seal
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Authenticate Current User
    try {
        const meRes = await fetch('/api/auth/me');
        const meData = await meRes.json();
        if (!meData.authenticated) {
            window.location.href = '/admin/login.html';
            return;
        }

        window.CURRENT_ADMIN = meData.user;
        const displayName = meData.user.full_name || meData.user.username;
        const userBadge = document.getElementById('adminUserBadge');
        if (userBadge) {
            userBadge.textContent = `Logged in: ${displayName} (${meData.user.role})`;
        }

        if (meData.user.role !== 'SUPER_ADMIN') {
            const navAdmins = document.getElementById('navItemAdmins');
            if (navAdmins) navAdmins.style.display = 'none';
        }
    } catch (e) {
        window.location.href = '/admin/login.html';
        return;
    }

    // 2. Setup Navigation Tabs & Mobile Menu Toggle
    const sidebarToggle = document.getElementById('adminSidebarToggle');
    const adminSidebar = document.getElementById('adminSidebar');

    if (sidebarToggle && adminSidebar) {
        sidebarToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            adminSidebar.classList.toggle('active');
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 992 && adminSidebar.classList.contains('active')) {
                if (!adminSidebar.contains(e.target) && e.target !== sidebarToggle) {
                    adminSidebar.classList.remove('active');
                }
            }
        });
    }

    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            switchTab(tabId, link);
        });
    });

    // Logout Button
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await fetch('/api/auth/logout', { method: 'POST' });
            window.location.href = '/admin/login.html';
        });
    }

    // Live search & filter for donations
    const searchInput = document.getElementById('donationsSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => loadDonations());
    }

    const methodFilter = document.getElementById('donationsMethodFilter');
    if (methodFilter) {
        methodFilter.addEventListener('change', () => loadDonations());
    }

    // 3. Quick Action Buttons
    const btnQuickDonation = document.getElementById('btnQuickAddDonation');
    if (btnQuickDonation) btnQuickDonation.addEventListener('click', openAddDonationModal);

    const btnAddDonation = document.getElementById('btnAddDonationModalBtn');
    if (btnAddDonation) btnAddDonation.addEventListener('click', openAddDonationModal);

    const btnQuickEvent = document.getElementById('btnQuickAddEvent');
    if (btnQuickEvent) btnQuickEvent.addEventListener('click', openAddEventModal);

    const btnAddEvent = document.getElementById('btnAddEventModalBtn');
    if (btnAddEvent) btnAddEvent.addEventListener('click', openAddEventModal);

    const btnQuickExpense = document.getElementById('btnQuickAddExpense');
    if (btnQuickExpense) btnQuickExpense.addEventListener('click', openAddExpenseModal);

    const btnAddExpense = document.getElementById('btnAddExpenseModalBtn');
    if (btnAddExpense) btnAddExpense.addEventListener('click', openAddExpenseModal);

    const btnQuickFood = document.getElementById('btnQuickAddFood');
    if (btnQuickFood) btnQuickFood.addEventListener('click', openAddFoodModal);

    const btnAddFood = document.getElementById('btnAddFoodModalBtn');
    if (btnAddFood) btnAddFood.addEventListener('click', openAddFoodModal);

    const btnAddAdmin = document.getElementById('btnAddAdminModalBtn');
    if (btnAddAdmin) btnAddAdmin.addEventListener('click', promptCreateAdmin);

    const btnAddComp = document.getElementById('btnAddCompetitionModalBtn');
    if (btnAddComp) btnAddComp.addEventListener('click', openAddCompetitionModal);

    const btnExport = document.getElementById('btnExportCSV');
    if (btnExport) btnExport.addEventListener('click', exportDonationsCSV);

    const btnBroadcast = document.getElementById('btnBroadcastModalBtn');
    if (btnBroadcast) btnBroadcast.addEventListener('click', () => openAdminModal('modalBroadcast'));

    // Form Event Listeners
    const formDonation = document.getElementById('formDonation');
    if (formDonation) formDonation.addEventListener('submit', handleSaveDonation);

    const formEvent = document.getElementById('formEvent');
    if (formEvent) formEvent.addEventListener('submit', handleSaveEvent);

    const formExpense = document.getElementById('formExpense');
    if (formExpense) formExpense.addEventListener('submit', handleSaveExpense);

    const formFood = document.getElementById('formFood');
    if (formFood) formFood.addEventListener('submit', handleSaveFood);

    const formComp = document.getElementById('formCompetition');
    if (formComp) formComp.addEventListener('submit', handleSaveCompetition);

    const formBroad = document.getElementById('formBroadcast');
    if (formBroad) formBroad.addEventListener('submit', handleBroadcastAnnouncement);

    const formSettings = document.getElementById('settingsForm');
    if (formSettings) formSettings.addEventListener('submit', handleSaveSettings);

    // Receipt Modal Action Buttons
    const btnWaImg = document.getElementById('btnWaShareImage');
    if (btnWaImg) btnWaImg.addEventListener('click', shareReceiptAsImage);

    const btnDlImg = document.getElementById('btnDownloadImage');
    if (btnDlImg) btnDlImg.addEventListener('click', downloadReceiptImage);

    const btnEditModal = document.getElementById('btnEditReceiptInModal');
    if (btnEditModal) btnEditModal.addEventListener('click', () => {
        if (window.CURRENT_DONATION) {
            closeAdminModal('modalReceiptView');
            editDonation(window.CURRENT_DONATION.id);
        }
    });

    // Close modal when clicking dark overlay backdrop
    document.querySelectorAll('.admin-modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeAdminModal(overlay.id);
            }
        });
    });

    // Load Initial Dashboard Data
    loadDashboardStats();
    loadDonations();
    loadEvents();
    loadFood();
    loadExpenses();
    loadCompetitions();
    loadSettings();
});

/* ==================== GLOBAL UTILITIES & MODAL CONTROLLERS ==================== */

function openAdminModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function closeAdminModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
}

function switchTab(tabId, targetLink = null) {
    // Hide all tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.style.display = 'none';
    });

    // Show target tab panel
    const targetPanel = document.getElementById(tabId);
    if (targetPanel) {
        targetPanel.classList.add('active');
        targetPanel.style.display = 'block';
    }

    // Update active class on sidebar nav links
    document.querySelectorAll('.sidebar-nav-link').forEach(link => {
        link.classList.remove('active');
    });

    if (targetLink) {
        targetLink.classList.add('active');
    } else {
        const link = document.querySelector(`.sidebar-nav-link[data-tab="${tabId}"]`);
        if (link) link.classList.add('active');
    }

    // Auto-close sidebar on mobile view
    if (window.innerWidth <= 992) {
        const adminSidebar = document.getElementById('adminSidebar');
        if (adminSidebar) adminSidebar.classList.remove('active');
    }

    if (tabId === 'tabCompetitions' && typeof loadCompetitions === 'function') {
        loadCompetitions();
    }

    // Refresh tab-specific data
    if (tabId === 'tabDashboard') loadDashboardStats();
    else if (tabId === 'tabDonations') loadDonations();
    else if (tabId === 'tabEvents') loadEvents();
    else if (tabId === 'tabFood') loadFood();
    else if (tabId === 'tabExpenses') loadExpenses();
    else if (tabId === 'tabAdmins') loadAdmins();
    else if (tabId === 'tabSettings') loadSettings();
    else if (tabId === 'tabAudit') loadAuditLogs();
}

/* 1. Dashboard Stats Module */
async function loadDashboardStats() {
    try {
        const res = await fetch('/api/dashboard/stats');
        const data = await res.json();
        if (data) {
            const dashChandaa = document.getElementById('dashTotalChandaa');
            if (dashChandaa) dashChandaa.textContent = '₹ ' + (data.totalDonations || 0).toLocaleString('en-IN');

            const dashExp = document.getElementById('dashTotalExpenses');
            if (dashExp) dashExp.textContent = '₹ ' + (data.totalExpenses || 0).toLocaleString('en-IN');

            const dashBal = document.getElementById('dashAvailableBalance');
            if (dashBal) dashBal.textContent = '₹ ' + (data.currentBalance || 0).toLocaleString('en-IN');

            const dashDonors = document.getElementById('dashTotalDonors');
            if (dashDonors) dashDonors.textContent = (data.totalDonors || 0);

            // Recent donations table
            const recDonBody = document.getElementById('dashRecentDonationsBody');
            if (recDonBody && data.recentDonations && data.recentDonations.length > 0) {
                recDonBody.innerHTML = data.recentDonations.map(d => `
                    <tr>
                        <td><strong style="color:var(--accent-crimson);">${d.receipt_number}</strong></td>
                        <td>${d.donor_name}</td>
                        <td><strong style="color:var(--primary-saffron);">₹ ${(d.amount || 0).toLocaleString('en-IN')}</strong></td>
                    </tr>
                `).join('');
            } else if (recDonBody) {
                recDonBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No recent donations</td></tr>';
            }

            // Recent expenses table
            const recExpBody = document.getElementById('dashRecentExpensesBody');
            if (recExpBody && data.recentExpenses && data.recentExpenses.length > 0) {
                recExpBody.innerHTML = data.recentExpenses.map(e => `
                    <tr>
                        <td><strong>${e.title}</strong></td>
                        <td><span style="background:#FEF3C7; color:var(--saffron-dark); padding:2px 6px; border-radius:4px; font-size:0.8rem;">${e.category}</span></td>
                        <td><strong style="color:var(--accent-crimson);">₹ ${(e.amount || 0).toLocaleString('en-IN')}</strong></td>
                    </tr>
                `).join('');
            } else if (recExpBody) {
                recExpBody.innerHTML = '<tr><td colspan="3" style="text-align:center;">No recent expenses</td></tr>';
            }
        }
    } catch (err) {
        console.error('Error loading dashboard stats:', err);
    }
}

/* 2. Donations / Chandaa Module */
async function openAddDonationModal() {
    const form = document.getElementById('formDonation');
    if (form) form.reset();
    document.getElementById('donId').value = '';
    document.getElementById('modalDonationTitle').textContent = '💰 Collect Chandaa Donation';
    document.getElementById('donDate').value = new Date().toISOString().split('T')[0];

    // Fetch next sequential receipt number
    try {
        const res = await fetch('/api/donations/receipt-next');
        const data = await res.json();
        if (data.nextReceipt) {
            document.getElementById('donReceiptNum').value = data.nextReceipt;
        }
    } catch(e){}

    openAdminModal('modalDonation');
}

async function editDonation(id) {
    try {
        const res = await fetch(`/api/donations/${id}`);
        const data = await res.json();
        if (!data.donation) return alert('Donation not found');

        const d = data.donation;
        document.getElementById('donId').value = d.id;
        document.getElementById('donReceiptNum').value = d.receipt_number;
        document.getElementById('donName').value = d.donor_name;
        document.getElementById('donMobile').value = d.mobile;
        document.getElementById('donAmount').value = d.amount;
        document.getElementById('donMethod').value = d.payment_method || 'Cash';
        document.getElementById('donRef').value = d.transaction_reference || '';
        document.getElementById('donDate').value = d.date;
        document.getElementById('donSponsorship').value = d.sponsorship_title || '';
        document.getElementById('donAnonymous').checked = d.is_anonymous === 1;

        document.getElementById('modalDonationTitle').textContent = `✏️ Edit Receipt (${d.receipt_number})`;
        openAdminModal('modalDonation');
    } catch(err) {
        alert('Error fetching donation details');
    }
}

async function handleSaveDonation(e) {
    e.preventDefault();
    const id = document.getElementById('donId').value;
    const payload = {
        donor_name: document.getElementById('donName').value.trim(),
        mobile: document.getElementById('donMobile').value.trim(),
        amount: document.getElementById('donAmount').value,
        payment_method: document.getElementById('donMethod').value,
        transaction_reference: document.getElementById('donRef').value.trim(),
        sponsorship_title: document.getElementById('donSponsorship').value.trim(),
        date: document.getElementById('donDate').value,
        is_anonymous: document.getElementById('donAnonymous').checked
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/donations/${id}` : '/api/donations';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (res.ok) {
            closeAdminModal('modalDonation');
            loadDonations();
            loadDashboardStats();

            const targetId = id || data.id;
            if (targetId) {
                viewReceipt(targetId);
            }
        } else {
            alert(data.error || 'Failed to save donation.');
        }
    } catch(err) {
        alert('Server error saving donation.');
    }
}

async function loadDonations() {
    const searchEl = document.getElementById('donationsSearchInput');
    const methodEl = document.getElementById('donationsMethodFilter');
    const search = searchEl ? searchEl.value.trim() : '';
    const method = methodEl ? methodEl.value : '';

    let url = '/api/donations?1=1';
    if (search) url += `&search=${encodeURIComponent(search)}`;
    if (method) url += `&payment_method=${encodeURIComponent(method)}`;

    try {
        const res = await fetch(url);
        const data = await res.json();
        const tbody = document.getElementById('donationsTableBody');
        if (!tbody) return;

        if (data.donations && data.donations.length > 0) {
            tbody.innerHTML = data.donations.map(d => {
                let collector = d.collected_by || 'Surya Mohan Reddy';
                if (collector.includes('@')) {
                    collector = collector.includes('surya') ? 'Surya Mohan Reddy' : 'Yaddala Ranjith Goud (Sunny)';
                }
                const escName = (d.donor_name || '').replace(/'/g, "\\'");
                return `
                    <tr>
                        <td><strong style="color:var(--accent-crimson);">${d.receipt_number}</strong></td>
                        <td><strong style="color:var(--text-main);">${d.donor_name}</strong> ${d.is_anonymous ? '<small style="color:orange;">(Anon)</small>' : ''}</td>
                        <td>${d.mobile}</td>
                        <td><strong style="color:var(--primary-saffron); font-size:1.05rem;">₹ ${Number(d.amount).toLocaleString('en-IN')}</strong></td>
                        <td>${d.date}</td>
                        <td><span style="background:#FEF3C7; color:var(--saffron-dark); padding:2px 8px; border-radius:4px; font-weight:800; font-size:0.8rem;">${d.payment_method}</span></td>
                        <td><strong style="color:var(--text-main);">${collector}</strong></td>
                        <td>
                            <div style="display:flex; gap:4px; flex-wrap:wrap;">
                                <button class="btn-admin" onclick="viewReceipt(${d.id})" style="padding:4px 8px; font-size:0.8rem;">🧾 Receipt</button>
                                <button class="btn-admin" onclick="editDonation(${d.id})" style="padding:4px 8px; font-size:0.8rem; background:#D97706; color:#FFF;">✏️ Edit</button>
                                <button class="btn-admin btn-admin-danger" onclick="deleteDonation(${d.id}, '${d.receipt_number}', '${escName}')" style="padding:4px 8px; font-size:0.8rem;">🗑️</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No donation records found.</td></tr>';
        }
    } catch(e){}
}

async function viewReceipt(id) {
    try {
        const res = await fetch(`/api/donations/${id}`);
        const data = await res.json();
        if (data.donation) {
            showReceiptModal(data.donation, data.whatsappUrl);
        }
    } catch(e){}
}

function showReceiptModal(donation, whatsappUrl) {
    window.CURRENT_DONATION = donation;

    document.getElementById('recReceiptNo').textContent = donation.receipt_number;
    document.getElementById('recDate').textContent = donation.date;
    document.getElementById('recDonorName').textContent = donation.donor_name;
    document.getElementById('recMobile').textContent = donation.mobile;
    document.getElementById('recMethod').textContent = donation.payment_method || 'Cash';

    let collectorName = donation.collected_by || 'Surya Mohan Reddy';
    if (collectorName.includes('@')) {
        collectorName = collectorName.includes('surya') ? 'Surya Mohan Reddy' : 'Yaddala Ranjith Goud (Sunny)';
    }
    document.getElementById('recCollectedBy').textContent = collectorName;
    document.getElementById('recAmount').textContent = '₹ ' + Number(donation.amount).toLocaleString('en-IN');

    const cleanMobile = (donation.mobile || '').replace(/\D/g, '');
    const waPhone = cleanMobile.length === 10 ? '91' + cleanMobile : cleanMobile;
    const origin = window.location.origin;
    const receiptLink = `${origin}/receipt.html?receipt=${encodeURIComponent(donation.receipt_number)}`;
    const textMsg = encodeURIComponent(`🕉️ *ANANTHAMPALLI VILLAGE VINAYAKA CHAVITHI 2026*\n\n*CHANDAA DONATION RECEIPT*\n\n🧾 *Receipt No:* ${donation.receipt_number}\n📅 *Date:* ${donation.date}\n👤 *Donor Name:* ${donation.donor_name}\n📞 *Mobile:* ${donation.mobile}\n💳 *Payment Method:* ${donation.payment_method || 'Cash'}\n👥 *Collected By:* ${collectorName}\n\n💰 *CONTRIBUTION AMOUNT RECEIVED:* ₹${Number(donation.amount).toLocaleString('en-IN')}\n\n🙏 *Thank you for your generous contribution towards our village festival celebrations.*\n\n📲 *View & Download Official Digital Receipt Online:*\n${receiptLink}\n\n" *GANAPATHI BAPPA MORYA!* 🙏 "`);
    
    const directWaBtn = document.getElementById('btnWaDirectSend');
    if (directWaBtn) {
        directWaBtn.href = `https://wa.me/${waPhone}?text=${textMsg}`;
    }

    openAdminModal('modalReceiptView');
}

async function deleteDonation(id, receiptNum = '', donorName = '') {
    const label = receiptNum ? `${receiptNum} (${donorName})` : `ID #${id}`;
    if (!confirm(`Are you sure you want to delete donation receipt ${label}?\nThis action cannot be undone.`)) return;

    try {
        const res = await fetch(`/api/donations/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            loadDonations();
            loadDashboardStats();
        } else {
            alert(data.error || 'Failed to delete donation record.');
        }
    } catch(e) {
        alert('Server error deleting donation.');
    }
}

/* Image Generation Utilities */
async function generateReceiptCanvas() {
    const element = document.getElementById('printableReceiptArea');
    if (!element) return null;
    if (typeof html2canvas === 'undefined') {
        throw new Error('html2canvas library is loading or missing');
    }
    return await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#FFFFFF',
        logging: false
    });
}

async function shareReceiptAsImage() {
    const donation = window.CURRENT_DONATION;
    if (!donation) return alert('No receipt selected');

    const btn = document.getElementById('btnWaShareImage');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Generating Image...';
    }

    try {
        const canvas = await generateReceiptCanvas();
        if (!canvas) throw new Error('Canvas render failed');

        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const fileName = `Receipt_${donation.receipt_number}.png`;
        const file = new File([blob], fileName, { type: 'image/png' });

        let mobile = String(donation.mobile).replace(/\D/g, '');
        if (mobile.length === 10) mobile = '91' + mobile;

        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: `Vinayaka Chavithi Receipt ${donation.receipt_number}`,
                text: `🙏 Official Receipt for ${donation.donor_name} Garu - ANANTHAMPALLI VINAYAKA CHAVITHI 2026 🕉️`
            });
        } else {
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();
            const rLink = `${window.location.origin}/receipt.html?receipt=${encodeURIComponent(donation.receipt_number)}`;
            window.open(`https://wa.me/${mobile}?text=${encodeURIComponent('🙏 Namaste ' + donation.donor_name + ' Garu,\nAttached is your official Chandaa donation receipt for ANANTHAMPALLI VILLAGE VINAYAKA CHAVITHI 2026. 🕉️\n\n📲 View & Download Digital Receipt Online:\n' + rLink)}`, '_blank');
        }
    } catch (err) {
        console.error('Image share error:', err);
        alert('Could not generate image receipt. Falling back to text receipt on WhatsApp.');
        if (window.CURRENT_WA_URL) window.open(window.CURRENT_WA_URL, '_blank');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

async function downloadReceiptImage() {
    const donation = window.CURRENT_DONATION;
    if (!donation) return alert('No receipt selected');

    const btn = document.getElementById('btnDownloadImage');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Generating Image...';
    }

    try {
        const canvas = await generateReceiptCanvas();
        if (!canvas) throw new Error('Canvas render failed');

        const link = document.createElement('a');
        link.download = `Receipt_${donation.receipt_number}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (err) {
        console.error('Download image error:', err);
        alert('Failed to generate downloadable image receipt.');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
}

/* 3. Program Events Module */
function openAddEventModal() {
    const form = document.getElementById('formEvent');
    if (form) form.reset();
    document.getElementById('evId').value = '';
    openAdminModal('modalEvent');
}

async function editEvent(id) {
    try {
        const res = await fetch(`/api/events/${id}`);
        const data = await res.json();
        if (!data.event) return alert('Event not found');

        const ev = data.event;
        document.getElementById('evId').value = ev.id;
        document.getElementById('evTitle').value = ev.title;
        document.getElementById('evDate').value = ev.event_date;
        document.getElementById('evStart').value = ev.start_time || '';
        document.getElementById('evEnd').value = ev.end_time || '';
        document.getElementById('evLoc').value = ev.location || '';
        document.getElementById('evCat').value = ev.category || 'Pooja';
        document.getElementById('evDesc').value = ev.description || '';

        openAdminModal('modalEvent');
    } catch(err) {
        alert('Error fetching event details');
    }
}

async function handleSaveEvent(e) {
    e.preventDefault();
    const id = document.getElementById('evId').value;
    const payload = {
        title: document.getElementById('evTitle').value.trim(),
        event_date: document.getElementById('evDate').value,
        start_time: document.getElementById('evStart').value,
        end_time: document.getElementById('evEnd').value,
        location: document.getElementById('evLoc').value,
        category: document.getElementById('evCat').value,
        description: document.getElementById('evDesc').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/events/${id}` : '/api/events';

    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    closeAdminModal('modalEvent');
    loadEvents();
}

async function loadEvents() {
    try {
        const res = await fetch('/api/events?status=all');
        const data = await res.json();
        const tbody = document.getElementById('eventsTableBody');
        if (!tbody) return;

        if (data.events && data.events.length > 0) {
            tbody.innerHTML = data.events.map(ev => `
                <tr>
                    <td>${ev.display_order || '--'}</td>
                    <td><strong style="color:var(--accent-crimson);">${ev.title}</strong></td>
                    <td>${ev.event_date} (${ev.start_time || ''})</td>
                    <td>${ev.location || '--'}</td>
                    <td><span style="background:#FEF3C7; color:var(--saffron-dark); padding:2px 8px; border-radius:4px; font-weight:700; font-size:0.8rem;">${ev.category}</span></td>
                    <td><span style="background:#059669; color:#FFF; padding:2px 8px; border-radius:10px; font-size:0.75rem; font-weight:700;">${ev.status}</span></td>
                    <td>
                        <div style="display:flex; gap:4px; flex-wrap:wrap;">
                            <button class="btn-admin" onclick="editEvent(${ev.id})" style="padding:4px 8px; font-size:0.8rem; background:#D97706; color:#FFF;">✏️ Edit</button>
                            <button class="btn-admin btn-admin-danger" onclick="deleteEvent(${ev.id})" style="padding:4px 8px; font-size:0.8rem;">🗑️</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No program events created yet.</td></tr>';
        }
    } catch(e){}
}

async function deleteEvent(id) {
    if (!confirm('Delete this event?')) return;
    await fetch(`/api/events/${id}`, { method: 'DELETE' });
    loadEvents();
}

/* 4. Annadanam Food Module */
function openAddFoodModal() {
    const form = document.getElementById('formFood');
    if (form) form.reset();
    document.getElementById('foodId').value = '';
    openAdminModal('modalFood');
}

async function editFood(id) {
    try {
        const res = await fetch(`/api/food/${id}`);
        const data = await res.json();
        if (!data.foodProgram) return alert('Annadanam schedule not found');

        const fp = data.foodProgram;
        document.getElementById('foodId').value = fp.id;
        document.getElementById('foodTitle').value = fp.title;
        document.getElementById('foodDate').value = fp.date;
        document.getElementById('foodMenu').value = fp.menu || '';
        document.getElementById('foodSponsor').value = fp.sponsor || '';
        document.getElementById('foodServings').value = fp.servings || '';

        openAdminModal('modalFood');
    } catch(err) {
        alert('Error fetching Annadanam schedule details');
    }
}

async function handleSaveFood(e) {
    e.preventDefault();
    const id = document.getElementById('foodId').value;
    const payload = {
        title: document.getElementById('foodTitle').value.trim(),
        date: document.getElementById('foodDate').value,
        menu: document.getElementById('foodMenu').value,
        sponsor: document.getElementById('foodSponsor').value,
        servings: document.getElementById('foodServings').value
    };
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/food/${id}` : '/api/food';

    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    closeAdminModal('modalFood');
    loadFood();
}

async function loadFood() {
    try {
        const res = await fetch('/api/food');
        const data = await res.json();
        const tbody = document.getElementById('foodTableBody');
        if (!tbody) return;

        if (data.foodPrograms && data.foodPrograms.length > 0) {
            tbody.innerHTML = data.foodPrograms.map(fp => `
                <tr>
                    <td><strong style="color:var(--accent-crimson);">${fp.title}</strong></td>
                    <td>${fp.date}</td>
                    <td>${fp.location || 'Main Mandap'}</td>
                    <td><small>${fp.menu || '--'}</small></td>
                    <td><strong style="color:var(--primary-saffron);">${fp.sponsor || '--'}</strong></td>
                    <td>${fp.servings || '--'}</td>
                    <td><span style="background:#FEF3C7; color:var(--saffron-dark); padding:2px 8px; border-radius:4px; font-weight:700; font-size:0.8rem;">${fp.status || 'SCHEDULED'}</span></td>
                    <td>
                        <div style="display:flex; gap:4px; flex-wrap:wrap;">
                            <button class="btn-admin" onclick="editFood(${fp.id})" style="padding:4px 8px; font-size:0.8rem; background:#D97706; color:#FFF;">✏️ Edit</button>
                            <button class="btn-admin btn-admin-danger" onclick="deleteFood(${fp.id})" style="padding:4px 8px; font-size:0.8rem;">🗑️</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No Annadanam schedules created yet.</td></tr>';
        }
    } catch(e){}
}

async function deleteFood(id) {
    if (!confirm('Delete this Annadanam schedule?')) return;
    await fetch(`/api/food/${id}`, { method: 'DELETE' });
    loadFood();
}

/* 5. Expense Module */
function openAddExpenseModal() {
    const form = document.getElementById('formExpense');
    if (form) form.reset();
    document.getElementById('expId').value = '';
    openAdminModal('modalExpense');
}

async function editExpense(id) {
    try {
        const res = await fetch(`/api/expenses/${id}`);
        const data = await res.json();
        if (!data.expense) return alert('Expense record not found');

        const exp = data.expense;
        document.getElementById('expId').value = exp.id;
        document.getElementById('expTitle').value = exp.title;
        document.getElementById('expCat').value = exp.category;
        document.getElementById('expAmount').value = exp.amount;
        document.getElementById('expDate').value = exp.expense_date;
        document.getElementById('expPaidTo').value = exp.paid_to || '';
        document.getElementById('expDesc').value = exp.description || '';

        openAdminModal('modalExpense');
    } catch(err) {
        alert('Error fetching expense record details');
    }
}

async function handleSaveExpense(e) {
    e.preventDefault();
    const id = document.getElementById('expId').value;
    const payload = {
        title: document.getElementById('expTitle').value.trim(),
        category: document.getElementById('expCat').value,
        amount: document.getElementById('expAmount').value,
        expense_date: document.getElementById('expDate').value,
        paid_to: document.getElementById('expPaidTo').value.trim(),
        description: document.getElementById('expDesc').value.trim()
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/expenses/${id}` : '/api/expenses';

    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    closeAdminModal('modalExpense');
    loadExpenses();
    loadDashboardStats();
}

async function loadExpenses() {
    try {
        const res = await fetch('/api/expenses');
        const data = await res.json();
        const tbody = document.getElementById('expensesTableBody');
        if (!tbody) return;

        if (data.expenses && data.expenses.length > 0) {
            tbody.innerHTML = data.expenses.map(e => `
                <tr>
                    <td><strong style="color:var(--text-main);">${e.title}</strong></td>
                    <td><span style="background:#FEF3C7; color:var(--saffron-dark); padding:2px 8px; border-radius:4px; font-weight:700; font-size:0.8rem;">${e.category}</span></td>
                    <td><strong style="color:var(--accent-crimson);">₹ ${Number(e.amount).toLocaleString('en-IN')}</strong></td>
                    <td>${e.expense_date}</td>
                    <td>${e.paid_to || '--'}</td>
                    <td>${e.payment_method || 'Cash'}</td>
                    <td>${e.created_by || 'Admin'}</td>
                    <td>
                        <div style="display:flex; gap:4px; flex-wrap:wrap;">
                            <button class="btn-admin" onclick="editExpense(${e.id})" style="padding:4px 8px; font-size:0.8rem; background:#D97706; color:#FFF;">✏️ Edit</button>
                            <button class="btn-admin btn-admin-danger" onclick="deleteExpense(${e.id})" style="padding:4px 8px; font-size:0.8rem;">🗑️</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;">No expense records logged yet.</td></tr>';
        }
    } catch(e){}
}

async function deleteExpense(id) {
    if (!confirm('Delete this expense record?')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    loadExpenses();
    loadDashboardStats();
}

/* 6. Settings Module */
async function loadSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        if (data.settings) {
            const fName = document.getElementById('setFestName');
            if (fName) fName.value = data.settings.festival_name || '';

            const fYear = document.getElementById('setFestYear');
            if (fYear) fYear.value = data.settings.festival_year || '';

            const cPerson = document.getElementById('setContactPerson');
            if (cPerson) cPerson.value = data.settings.contact_person || '';

            const cNum = document.getElementById('setContactNumber');
            if (cNum) cNum.value = data.settings.contact_number || '';

            const dDev = document.getElementById('setDevContact');
            if (dDev) dDev.value = data.settings.developer_contact || '';

            const rPrefix = document.getElementById('setReceiptPrefix');
            if (rPrefix) rPrefix.value = data.settings.receipt_prefix || '';
        }
    } catch(e){}
}

async function handleSaveSettings(e) {
    e.preventDefault();
    const payload = {
        festival_name: document.getElementById('setFestName').value,
        festival_year: document.getElementById('setFestYear').value,
        contact_person: document.getElementById('setContactPerson').value,
        contact_number: document.getElementById('setContactNumber').value,
        developer_contact: document.getElementById('setDevContact').value,
        receipt_prefix: document.getElementById('setReceiptPrefix').value
    };

    await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    alert('Settings updated successfully!');
}

/* 7. Admins Module (Super Admin Management) */
async function loadAdmins() {
    try {
        const res = await fetch('/api/admins');
        const data = await res.json();
        const tbody = document.getElementById('adminsTableBody');
        if (!tbody) return;

        if (data.admins && data.admins.length > 0) {
            tbody.innerHTML = data.admins.map(a => {
                const isCurrentAdmin = window.CURRENT_ADMIN && window.CURRENT_ADMIN.id === a.id;
                const escUser = (a.username || '').replace(/'/g, "\\'");
                return `
                    <tr>
                        <td>${a.id}</td>
                        <td>
                            <strong style="color:var(--text-main);">${a.username}</strong>
                            ${a.full_name ? `<br><small style="color:var(--text-muted);">${a.full_name}</small>` : ''}
                        </td>
                        <td><span style="background:#FEF3C7; color:var(--saffron-dark); padding:2px 8px; border-radius:4px; font-weight:700; font-size:0.8rem;">${a.role}</span></td>
                        <td><span style="color:${a.is_active ? '#059669' : 'red'}; font-weight:700;">${a.is_active ? 'ACTIVE' : 'DISABLED'}</span></td>
                        <td>${a.created_at || '--'}</td>
                        <td>
                            <div style="display:flex; gap:6px; flex-wrap:wrap;">
                                <button class="btn-admin" onclick="resetAdminPassword(${a.id}, '${escUser}')" style="padding:4px 8px; font-size:0.78rem; background:#D97706; color:#FFF;">🔑 Password</button>
                                ${!isCurrentAdmin ? `
                                    <button class="btn-admin" onclick="toggleAdminStatus(${a.id})" style="padding:4px 8px; font-size:0.78rem; background:${a.is_active ? '#4B5563' : '#059669'}; color:#FFF;">${a.is_active ? 'Disable' : 'Enable'}</button>
                                    <button class="btn-admin btn-admin-danger" onclick="deleteAdminAccount(${a.id}, '${escUser}')" style="padding:4px 8px; font-size:0.78rem;">🗑️ Delete</button>
                                ` : '<small style="color:var(--accent-crimson); font-weight:bold;">(Current Logged-in)</small>'}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No admin accounts found.</td></tr>';
        }
    } catch(e){}
}

async function promptCreateAdmin() {
    const username = prompt('Enter new Admin Username or Email:');
    if (!username || !username.trim()) return;

    const fullName = prompt('Enter Admin Full Name (Optional):', username.split('@')[0]);
    const password = prompt('Enter Password for new Admin (Min 6 chars):');
    if (!password || password.trim().length < 6) {
        return alert('Password must be at least 6 characters.');
    }

    const isSuper = confirm('Should this user be a SUPER ADMIN? (Click OK for Super Admin, Cancel for Standard Admin)');
    const role = isSuper ? 'SUPER_ADMIN' : 'ADMIN';

    try {
        const res = await fetch('/api/admins', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username.trim(),
                full_name: fullName ? fullName.trim() : username.trim(),
                password: password.trim(),
                role
            })
        });

        const data = await res.json();
        if (res.ok) {
            alert(`✅ Admin account "${username}" created successfully as ${role}!`);
            loadAdmins();
        } else {
            alert(data.error || 'Failed to create admin account.');
        }
    } catch(err) {
        alert('Server error creating admin account.');
    }
}

async function resetAdminPassword(id, username) {
    const newPassword = prompt(`Enter NEW password for admin "${username}" (Min 6 characters):`);
    if (!newPassword || newPassword.trim().length < 6) {
        if (newPassword !== null) alert('Password must be at least 6 characters.');
        return;
    }

    try {
        const res = await fetch(`/api/admins/${id}/reset-password`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword: newPassword.trim() })
        });

        const data = await res.json();
        if (res.ok) {
            alert(`✅ Password updated successfully for admin "${username}"!`);
        } else {
            alert(data.error || 'Failed to reset password.');
        }
    } catch(err) {
        alert('Server error resetting password.');
    }
}

async function toggleAdminStatus(id) {
    try {
        const res = await fetch(`/api/admins/${id}/toggle`, { method: 'PUT' });
        const data = await res.json();
        if (res.ok) {
            loadAdmins();
        } else {
            alert(data.error || 'Failed to change admin status.');
        }
    } catch(err) {
        alert('Server error toggling admin status.');
    }
}

async function deleteAdminAccount(id, username) {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE admin account "${username}"?\nThis action cannot be undone.`)) return;

    try {
        const res = await fetch(`/api/admins/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (res.ok) {
            alert(`✅ Admin account "${username}" deleted successfully.`);
            loadAdmins();
        } else {
            alert(data.error || 'Failed to delete admin account.');
        }
    } catch(err) {
        alert('Server error deleting admin account.');
    }
}

/* 8. Audit Logs Module */
async function loadAuditLogs() {
    try {
        const res = await fetch('/api/audit');
        const data = await res.json();
        const tbody = document.getElementById('auditLogsBody');
        if (!tbody) return;

        if (data.logs && data.logs.length > 0) {
            tbody.innerHTML = data.logs.map(l => `
                <tr>
                    <td><small>${l.created_at || '--'}</small></td>
                    <td><strong style="color:var(--text-main);">${l.admin_username || 'Admin'}</strong></td>
                    <td><span style="background:#FEF3C7; color:var(--accent-crimson); padding:2px 6px; border-radius:4px; font-weight:700; font-size:0.8rem;">${l.action}</span></td>
                    <td>${l.entity || '--'}</td>
                    <td>${l.details || ''}</td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No audit logs recorded yet.</td></tr>';
        }
    } catch(e){}
}

/* 9. Competitions & Sports Winners Module */
function openAddCompetitionModal() {
    const form = document.getElementById('formCompetition');
    if (form) form.reset();
    document.getElementById('compId').value = '';
    openAdminModal('modalCompetition');
}

async function editCompetition(id) {
    try {
        const res = await fetch(`/api/competitions/${id}`);
        const data = await res.json();
        if (!data.competition) return alert('Competition record not found');

        const c = data.competition;
        document.getElementById('compId').value = c.id;
        document.getElementById('compGameName').value = c.game_name || '';
        document.getElementById('compCategory').value = c.category || 'Sports';
        document.getElementById('compCaptain').value = c.captain_name || '';
        document.getElementById('compTeamMembers').value = c.team_members || '';
        document.getElementById('compWinner').value = c.winner_name || '';
        document.getElementById('compRunner').value = c.runner_name || '';
        document.getElementById('compSponsor').value = c.sponsor || '';
        document.getElementById('compDate').value = c.event_date || '';

        openAdminModal('modalCompetition');
    } catch(err) {
        alert('Error fetching competition details');
    }
}

async function handleSaveCompetition(e) {
    e.preventDefault();
    const id = document.getElementById('compId').value;
    const payload = {
        game_name: document.getElementById('compGameName').value.trim(),
        category: document.getElementById('compCategory').value,
        captain_name: document.getElementById('compCaptain').value.trim(),
        team_members: document.getElementById('compTeamMembers').value.trim(),
        winner_name: document.getElementById('compWinner').value.trim(),
        runner_name: document.getElementById('compRunner').value.trim(),
        sponsor: document.getElementById('compSponsor').value.trim(),
        event_date: document.getElementById('compDate').value
    };

    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/competitions/${id}` : '/api/competitions';

    try {
        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (res.ok) {
            closeAdminModal('modalCompetition');
            loadCompetitions();
        } else {
            alert(data.error || 'Failed to save competition record.');
        }
    } catch(err) {
        alert('Server error saving competition record.');
    }
}

async function loadCompetitions() {
    try {
        const res = await fetch('/api/competitions');
        const data = await res.json();
        const tbody = document.getElementById('competitionsTableBody');
        if (!tbody) return;

        if (data.competitions && data.competitions.length > 0) {
            tbody.innerHTML = data.competitions.map(c => `
                <tr>
                    <td><strong style="color:var(--accent-crimson);">${c.game_name}</strong></td>
                    <td><span style="background:#FEF3C7; color:var(--saffron-dark); padding:2px 8px; border-radius:4px; font-weight:800; font-size:0.8rem;">${c.category || 'Sports'}</span></td>
                    <td><strong>${c.captain_name || 'N/A'}</strong></td>
                    <td><small style="color:var(--text-sub);">${c.team_members || 'N/A'}</small></td>
                    <td><strong style="color:green;">🥇 ${c.winner_name || 'TBA'}</strong></td>
                    <td><strong style="color:#D97706;">🥈 ${c.runner_name || 'TBA'}</strong></td>
                    <td><strong>${c.sponsor || 'Village Committee'}</strong></td>
                    <td>${c.event_date || '--'}</td>
                    <td>
                        <div style="display:flex; gap:4px;">
                            <button class="btn-admin" onclick="editCompetition(${c.id})" style="padding:4px 8px; font-size:0.8rem; background:#D97706; color:#FFF;">✏️ Edit</button>
                            <button class="btn-admin btn-admin-danger" onclick="deleteCompetition(${c.id})" style="padding:4px 8px; font-size:0.8rem;">🗑️</button>
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No competition/winner records added yet.</td></tr>';
        }
    } catch(e){}
}

async function deleteCompetition(id) {
    if (!confirm('Are you sure you want to delete this competition record?')) return;
    try {
        const res = await fetch(`/api/competitions/${id}`, { method: 'DELETE' });
        if (res.ok) {
            loadCompetitions();
        } else {
            alert('Failed to delete competition record.');
        }
    } catch(e) {
        alert('Server error deleting competition record.');
    }
}

function exportDonationsCSV() {
    window.location.href = '/api/export/donations';
}

async function handleBroadcastAnnouncement(e) {
    e.preventDefault();
    const title = document.getElementById('broadTitle').value.trim();
    const type = document.getElementById('broadType').value;
    const message = document.getElementById('broadMessage').value.trim();

    try {
        const res = await fetch('/api/notifications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, type, message })
        });
        const data = await res.json();
        if (res.ok) {
            alert('🚀 Announcement broadcast live to website visitors!');
            closeAdminModal('modalBroadcast');
            document.getElementById('formBroadcast').reset();
        } else {
            alert(data.error || 'Failed to broadcast announcement.');
        }
    } catch(err) {
        alert('Server error broadcasting announcement.');
    }
}

// Global window exposure
window.openAddCompetitionModal = openAddCompetitionModal;
window.editCompetition = editCompetition;
window.deleteCompetition = deleteCompetition;
window.loadCompetitions = loadCompetitions;
window.exportDonationsCSV = exportDonationsCSV;
