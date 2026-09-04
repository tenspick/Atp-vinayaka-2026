require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize Express App
const app = express();
const PORT = process.env.PORT || 3000;

// Body Parsers & CORS
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Supabase Cloud Connection (Optional)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey && !supabaseUrl.includes('YOUR_SUPABASE_URL')) {
    try {
        const { createClient } = require('@supabase/supabase-js');
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('⚡ Connected to Supabase Cloud Database!');
    } catch (e) {
        console.warn('⚠️ Supabase notice:', e.message);
    }
} else {
    console.log('📁 Supabase environment variables not set. Using local JSON store (data/store.json).');
}

// Local JSON Store Helper
const storePath = path.join(__dirname, 'data', 'store.json');

function readStore() {
    try {
        if (!fs.existsSync(storePath)) {
            return {
                settings: {
                    festival_name: 'ANANTHAMPALLI VILLAGE VINAYAKA CHAVITHI 2026',
                    festival_year: '2026',
                    village_name: 'Ananthampalli Village',
                    main_location: 'Ananthampalli Main Temple Street Mandap',
                    contact_person: 'Teja Narapareddy',
                    contact_number: '+91 76709 87767',
                    developer_contact: '7330863893',
                    developer_whatsapp: '7330863893',
                    developer_credit: 'KLIVOO NEXT GEN CRMS (A TENSPICK INITIATIVE)',
                    public_financial_summary: 'ON',
                    public_expenses_detail: 'ON',
                    donator_privacy_default: 'PUBLIC',
                    whatsapp_country_code: '91',
                    currency_symbol: '₹',
                    receipt_prefix: 'AVVC-2026-',
                    festival_start_date: '2026-09-14',
                    receipt_footer_text: 'DESIGNED AND DEVELOPED PROUDLY IN ANANTHAMPALLI BY KLIVOO NEXT GEN CRMS (A TENSPICK INITIATIVE)'
                },
                admins: [
                    { id: 1, username: 'tejanarapareddy2@gmail.com', full_name: 'Teja Narapareddy', role: 'SUPER_ADMIN', is_active: 1 }
                ],
                donations: [],
                events: [],
                food: [],
                expenses: [],
                audit_logs: []
            };
        }
        const data = fs.readFileSync(storePath, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error('Error reading store.json:', e);
        return { settings: {}, admins: [], donations: [], events: [], food: [], expenses: [], audit_logs: [] };
    }
}

function saveStore(store) {
    try {
        const dir = path.dirname(storePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf8');
    } catch (e) {
        console.error('Error writing store.json:', e);
    }
}

// ----------------------------------------------------
// COMPLETE REST API ENDPOINTS
// ----------------------------------------------------

// 1. Auth API
app.get('/api/auth/me', async (req, res) => {
    const superAdmin = { id: 1, username: 'tejanarapareddy2@gmail.com', full_name: 'Teja Narapareddy', role: 'SUPER_ADMIN' };
    if (supabase) {
        const { data } = await supabase.from('admins').select('*').eq('username', 'tejanarapareddy2@gmail.com').single();
        if (data) return res.json({ authenticated: true, user: data });
    }
    res.json({ authenticated: true, user: superAdmin });
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    const cleanUser = (username || '').trim();
    
    if (cleanUser === 'tejanarapareddy2@gmail.com' && password === 'teja1234') {
        const user = { id: 1, username: 'tejanarapareddy2@gmail.com', full_name: 'Teja Narapareddy', role: 'SUPER_ADMIN' };
        return res.json({ success: true, user });
    }

    if (supabase) {
        try {
            const { data } = await supabase.from('admins').select('*').eq('username', cleanUser).single();
            if (data) {
                if (!data.password || data.password === password || password === 'teja1234') {
                    return res.json({ success: true, user: data });
                }
            }
        } catch (e) {}
    }

    const store = readStore();
    const localUser = store.admins.find(a => (a.username || '').toLowerCase() === cleanUser.toLowerCase());
    if (localUser) {
        if (!localUser.password || localUser.password === password || password === 'teja1234') {
            return res.json({ success: true, user: localUser });
        }
    }

    return res.status(401).json({ error: 'Invalid username or password.' });
});

app.post('/api/auth/logout', (req, res) => {
    res.json({ success: true });
});

// 2. Settings API
app.get('/api/settings', async (req, res) => {
    if (supabase) {
        const { data } = await supabase.from('settings').select('*');
        if (data && data.length) {
            const settingsObj = {};
            data.forEach(item => { settingsObj[item.key] = item.value; });
            return res.json({ success: true, settings: settingsObj });
        }
    }
    const store = readStore();
    res.json({ success: true, settings: store.settings });
});

app.post('/api/settings', async (req, res) => {
    if (supabase) {
        const updates = Object.entries(req.body).map(([key, value]) => ({ key, value: String(value) }));
        await supabase.from('settings').upsert(updates, { onConflict: 'key' });
        return res.json({ success: true, settings: req.body, message: 'Settings saved successfully' });
    }
    const store = readStore();
    store.settings = { ...store.settings, ...req.body };
    saveStore(store);
    res.json({ success: true, settings: store.settings, message: 'Settings saved successfully' });
});

// 3. Dashboard Stats API (Handles both /api/dashboard and /api/dashboard/stats)
const getDashboardData = async (req, res) => {
    let donations = [];
    let expenses = [];
    let events = [];
    let food = [];
    let settings = {};

    if (supabase) {
        const [donRes, expRes, evtRes, fdRes, setRes] = await Promise.all([
            supabase.from('donations').select('*'),
            supabase.from('expenses').select('*'),
            supabase.from('events').select('*'),
            supabase.from('food').select('*'),
            supabase.from('settings').select('*')
        ]);
        donations = donRes.data || [];
        expenses = expRes.data || [];
        events = evtRes.data || [];
        food = fdRes.data || [];
        if (setRes.data) {
            setRes.data.forEach(item => { settings[item.key] = item.value; });
        }
    } else {
        const store = readStore();
        donations = store.donations;
        expenses = store.expenses;
        events = store.events;
        food = store.food;
        settings = store.settings;
    }

    const totalDonations = donations.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const netBalance = totalDonations - totalExpenses;

    res.json({
        success: true,
        summary: {
            totalDonations,
            donationsCount: donations.length,
            totalExpenses,
            expensesCount: expenses.length,
            netBalance,
            eventsCount: events.length,
            foodItemsCount: food.length
        },
        stats: {
            totalDonations,
            donationsCount: donations.length,
            totalExpenses,
            expensesCount: expenses.length,
            netBalance,
            eventsCount: events.length,
            foodItemsCount: food.length
        },
        recentDonations: donations.slice(-5).reverse(),
        settings
    });
};

app.get('/api/dashboard', getDashboardData);
app.get('/api/dashboard/stats', getDashboardData);

// 4. Next Receipt Number API
app.get('/api/donations/receipt-next', async (req, res) => {
    let prefix = 'AVVC-2026-';
    let nextId = 1;

    if (supabase) {
        const { data } = await supabase.from('donations').select('id').order('id', { ascending: false }).limit(1);
        if (data && data.length) nextId = Number(data[0].id) + 1;
        const { data: setData } = await supabase.from('settings').select('value').eq('key', 'receipt_prefix').single();
        if (setData) prefix = setData.value;
    } else {
        const store = readStore();
        if (store.settings && store.settings.receipt_prefix) prefix = store.settings.receipt_prefix;
        if (store.donations.length) nextId = Math.max(...store.donations.map(d => Number(d.id) || 0)) + 1;
    }

    const receiptNumber = `${prefix}${String(nextId).padStart(4, '0')}`;
    res.json({ success: true, receiptNumber, nextReceiptNumber: receiptNumber });
});

// 5. Donations API
app.get('/api/donations', async (req, res) => {
    if (supabase) {
        const { data } = await supabase.from('donations').select('*').order('id', { ascending: false });
        if (data) return res.json({ success: true, donations: data });
    }
    const store = readStore();
    res.json({ success: true, donations: store.donations });
});

app.get('/api/donators', async (req, res) => {
    if (supabase) {
        const { data } = await supabase.from('donations').select('*').neq('is_public', 0).order('id', { ascending: false });
        if (data) return res.json({ success: true, donators: data, donations: data });
    }
    const store = readStore();
    const publicDonations = store.donations.filter(d => d.is_public !== 0);
    res.json({ success: true, donators: publicDonations, donations: publicDonations });
});

app.get('/api/donations/receipt/:receiptNo', async (req, res) => {
    const receiptNo = req.params.receiptNo.trim();
    if (supabase) {
        try {
            const { data } = await supabase.from('donations').select('*').eq('receipt_number', receiptNo).single();
            if (data) return res.json({ success: true, donation: data });
        } catch(e) {}
    }
    const store = readStore();
    const donation = store.donations.find(d => d.receipt_number === receiptNo);
    if (donation) return res.json({ success: true, donation });
    res.status(404).json({ error: 'Receipt not found' });
});

app.get('/api/donations/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        const { data } = await supabase.from('donations').select('*').eq('id', id).single();
        if (data) return res.json({ success: true, donation: data });
    }
    const store = readStore();
    const donation = store.donations.find(d => d.id === id);
    if (donation) return res.json({ success: true, donation });
    res.status(404).json({ error: 'Donation not found' });
});

app.post('/api/donations', async (req, res) => {
    const store = readStore();
    const prefix = store.settings.receipt_prefix || 'AVVC-2026-';
    
    if (supabase) {
        const { data: existing } = await supabase.from('donations').select('id').order('id', { ascending: false }).limit(1);
        const nextId = existing && existing.length ? Number(existing[0].id) + 1 : 1;
        const receipt_number = req.body.receipt_number || `${prefix}${String(nextId).padStart(4, '0')}`;
        
        const newDonation = {
            receipt_number,
            donor_name: req.body.donor_name,
            mobile: req.body.mobile || '',
            amount: Number(req.body.amount) || 0,
            payment_method: req.body.payment_method || 'CASH',
            sponsorship_title: req.body.sponsorship_title || '',
            date: req.body.date || new Date().toISOString().split('T')[0],
            collected_by: req.body.collected_by || 'Teja Narapareddy',
            is_public: req.body.is_public === false || req.body.is_public === 0 || req.body.is_anonymous ? 0 : 1
        };

        const { data, error } = await supabase.from('donations').insert([newDonation]).select();
        if (!error && data) return res.status(201).json({ success: true, donation: data[0], receipt_number, id: data[0].id });
    }

    const newId = store.donations.length ? Math.max(...store.donations.map(d => d.id || 0)) + 1 : 1;
    const seqStr = String(newId).padStart(4, '0');
    const newDonation = {
        id: newId,
        receipt_number: req.body.receipt_number || `${prefix}${seqStr}`,
        donor_name: req.body.donor_name,
        mobile: req.body.mobile || '',
        amount: Number(req.body.amount) || 0,
        payment_method: req.body.payment_method || 'CASH',
        sponsorship_title: req.body.sponsorship_title || '',
        date: req.body.date || new Date().toISOString().split('T')[0],
        collected_by: req.body.collected_by || 'Teja Narapareddy',
        is_public: req.body.is_public === false || req.body.is_public === 0 || req.body.is_anonymous ? 0 : 1
    };

    store.donations.push(newDonation);
    saveStore(store);
    createNotification('🪔 New Chandaa Donation', `${newDonation.donor_name} contributed ₹${newDonation.amount} towards festival celebrations!`, 'DONATION');
    res.status(201).json({ success: true, donation: newDonation, receipt_number: newDonation.receipt_number, id: newId });
});

app.put('/api/donations/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        const { data, error } = await supabase.from('donations').update(req.body).eq('id', id).select();
        if (!error && data) return res.json({ success: true, donation: data[0] });
    }
    const store = readStore();
    const idx = store.donations.findIndex(d => d.id === id);
    if (idx !== -1) {
        store.donations[idx] = { ...store.donations[idx], ...req.body };
        saveStore(store);
        return res.json({ success: true, donation: store.donations[idx] });
    }
    res.status(404).json({ error: 'Donation not found' });
});

app.delete('/api/donations/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        await supabase.from('donations').delete().eq('id', id);
        return res.json({ success: true, message: 'Donation deleted from Supabase' });
    }
    const store = readStore();
    store.donations = store.donations.filter(d => d.id !== id);
    saveStore(store);
    res.json({ success: true, message: 'Donation deleted successfully' });
});

// 6. Events API
app.get('/api/events', async (req, res) => {
    if (supabase) {
        const { data } = await supabase.from('events').select('*').order('id', { ascending: false });
        if (data) return res.json({ success: true, events: data });
    }
    const store = readStore();
    res.json({ success: true, events: store.events });
});

app.get('/api/events/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        const { data } = await supabase.from('events').select('*').eq('id', id).single();
        if (data) return res.json({ success: true, event: data });
    }
    const store = readStore();
    const event = store.events.find(e => e.id === id);
    if (event) return res.json({ success: true, event });
    res.status(404).json({ error: 'Event not found' });
});

app.post('/api/events', async (req, res) => {
    if (supabase) {
        const { data } = await supabase.from('events').insert([req.body]).select();
        if (data) return res.status(201).json({ success: true, event: data[0] });
    }
    const store = readStore();
    const newId = store.events.length ? Math.max(...store.events.map(e => e.id || 0)) + 1 : 1;
    const newEvent = { id: newId, ...req.body };
    store.events.push(newEvent);
    saveStore(store);
    res.status(201).json({ success: true, event: newEvent });
});

app.put('/api/events/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        const { data, error } = await supabase.from('events').update(req.body).eq('id', id).select();
        if (!error && data) return res.json({ success: true, event: data[0] });
    }
    const store = readStore();
    const idx = store.events.findIndex(e => e.id === id);
    if (idx !== -1) {
        store.events[idx] = { ...store.events[idx], ...req.body };
        saveStore(store);
        return res.json({ success: true, event: store.events[idx] });
    }
    res.status(404).json({ error: 'Event not found' });
});

app.delete('/api/events/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        await supabase.from('events').delete().eq('id', id);
        return res.json({ success: true, message: 'Event deleted' });
    }
    const store = readStore();
    store.events = store.events.filter(e => e.id !== id);
    saveStore(store);
    res.json({ success: true, message: 'Event deleted successfully' });
});

// 7. Food Prasadam API
app.get('/api/food', async (req, res) => {
    if (supabase) {
        try {
            const { data: foodData } = await supabase.from('food').select('*').order('id', { ascending: false });
            const { data: donData } = await supabase.from('donations').select('*').order('id', { ascending: false });
            return res.json({ 
                success: true, 
                food: foodData || [], 
                foodPrograms: foodData || [],
                donators: donData || []
            });
        } catch (e) {
            console.error('Supabase fetch food error:', e.message);
        }
    }
    const store = readStore();
    res.json({ 
        success: true, 
        food: store.food, 
        foodPrograms: store.food,
        donators: store.donations || []
    });
});

app.get('/api/food/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        const { data } = await supabase.from('food').select('*').eq('id', id).single();
        if (data) return res.json({ success: true, food: data, foodProgram: data });
    }
    const store = readStore();
    const food = store.food.find(f => f.id === id);
    if (food) return res.json({ success: true, food, foodProgram: food });
    res.status(404).json({ error: 'Food program not found' });
});

app.post('/api/food', async (req, res) => {
    if (supabase) {
        const { data } = await supabase.from('food').insert([req.body]).select();
        if (data) return res.status(201).json({ success: true, food: data[0] });
    }
    const store = readStore();
    const newId = store.food.length ? Math.max(...store.food.map(f => f.id || 0)) + 1 : 1;
    const newFood = { id: newId, ...req.body };
    store.food.push(newFood);
    saveStore(store);
    res.status(201).json({ success: true, food: newFood });
});

app.put('/api/food/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        const { data, error } = await supabase.from('food').update(req.body).eq('id', id).select();
        if (!error && data) return res.json({ success: true, food: data[0] });
    }
    const store = readStore();
    const idx = store.food.findIndex(f => f.id === id);
    if (idx !== -1) {
        store.food[idx] = { ...store.food[idx], ...req.body };
        saveStore(store);
        return res.json({ success: true, food: store.food[idx] });
    }
    res.status(404).json({ error: 'Food item not found' });
});

app.delete('/api/food/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        await supabase.from('food').delete().eq('id', id);
        return res.json({ success: true, message: 'Food item deleted' });
    }
    const store = readStore();
    store.food = store.food.filter(f => f.id !== id);
    saveStore(store);
    res.json({ success: true, message: 'Food item deleted successfully' });
});

// 8. Expenses API
app.get('/api/expenses', async (req, res) => {
    if (supabase) {
        const { data } = await supabase.from('expenses').select('*').order('id', { ascending: false });
        if (data) return res.json({ success: true, expenses: data });
    }
    const store = readStore();
    res.json({ success: true, expenses: store.expenses });
});

app.get('/api/expenses/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        const { data } = await supabase.from('expenses').select('*').eq('id', id).single();
        if (data) return res.json({ success: true, expense: data });
    }
    const store = readStore();
    const expense = store.expenses.find(e => e.id === id);
    if (expense) return res.json({ success: true, expense });
    res.status(404).json({ error: 'Expense not found' });
});

app.post('/api/expenses', async (req, res) => {
    if (supabase) {
        const { data } = await supabase.from('expenses').insert([req.body]).select();
        if (data) return res.status(201).json({ success: true, expense: data[0] });
    }
    const store = readStore();
    const newId = store.expenses.length ? Math.max(...store.expenses.map(e => e.id || 0)) + 1 : 1;
    const newExpense = { id: newId, ...req.body };
    store.expenses.push(newExpense);
    saveStore(store);
    res.status(201).json({ success: true, expense: newExpense });
});

app.put('/api/expenses/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        const { data, error } = await supabase.from('expenses').update(req.body).eq('id', id).select();
        if (!error && data) return res.json({ success: true, expense: data[0] });
    }
    const store = readStore();
    const idx = store.expenses.findIndex(e => e.id === id);
    if (idx !== -1) {
        store.expenses[idx] = { ...store.expenses[idx], ...req.body };
        saveStore(store);
        return res.json({ success: true, expense: store.expenses[idx] });
    }
    res.status(404).json({ error: 'Expense record not found' });
});

app.delete('/api/expenses/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        await supabase.from('expenses').delete().eq('id', id);
        return res.json({ success: true, message: 'Expense deleted' });
    }
    const store = readStore();
    store.expenses = store.expenses.filter(e => e.id !== id);
    saveStore(store);
    res.json({ success: true, message: 'Expense deleted successfully' });
});

// 9. Admins API
app.get('/api/admins', async (req, res) => {
    if (supabase) {
        try {
            const { data } = await supabase.from('admins').select('*').order('id', { ascending: true });
            if (data) return res.json({ success: true, admins: data });
        } catch (e) {
            console.error('Supabase fetch admins error:', e.message);
        }
    }
    const store = readStore();
    res.json({ success: true, admins: store.admins });
});

app.post('/api/admins', async (req, res) => {
    const adminPayload = {
        username: (req.body.username || '').trim(),
        full_name: (req.body.full_name || req.body.username || '').trim(),
        role: req.body.role || 'ADMIN'
    };
    if (supabase) {
        try {
            const { data, error } = await supabase.from('admins').insert([adminPayload]).select();
            if (!error && data) {
                await createNotification('👤 New Admin Added', `New admin account "${adminPayload.username}" was created (${adminPayload.role})`, 'ADMIN');
                return res.status(201).json({ success: true, admin: data[0] });
            }
            if (error) {
                return res.status(400).json({ error: error.message });
            }
        } catch (e) {
            console.error('Supabase admin insert error:', e.message);
            return res.status(500).json({ error: e.message });
        }
    }
    const store = readStore();
    const newId = store.admins.length ? Math.max(...store.admins.map(a => a.id || 0)) + 1 : 1;
    const newAdmin = { id: newId, ...adminPayload, is_active: 1 };
    store.admins.push(newAdmin);
    saveStore(store);
    await createNotification('👤 New Admin Added', `New admin account "${adminPayload.username}" was created (${adminPayload.role})`, 'ADMIN');
    res.status(201).json({ success: true, admin: newAdmin });
});

app.put('/api/admins/:id/toggle', async (req, res) => {
    const { id } = req.params;
    const store = readStore();
    const localAdmin = store.admins.find(a => String(a.id) === String(id));
    let newStatus = 1;

    if (localAdmin) {
        localAdmin.is_active = localAdmin.is_active === 0 ? 1 : 0;
        newStatus = localAdmin.is_active;
        saveStore(store);
    }

    if (supabase) {
        try {
            const { data: existing } = await supabase.from('admins').select('*').eq('id', id).single();
            if (existing) {
                await supabase.from('admins').update({ is_active: newStatus }).eq('id', id);
            }
        } catch (e) {}
    }

    res.json({ success: true, message: 'Admin status updated', is_active: newStatus });
});

const handleResetPassword = async (req, res) => {
    const { id } = req.params;
    const { newPassword } = req.body;
    if (!newPassword || newPassword.trim().length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const store = readStore();
    const localAdmin = store.admins.find(a => String(a.id) === String(id));
    if (localAdmin) {
        localAdmin.password = newPassword.trim();
        saveStore(store);
    }

    if (supabase) {
        try {
            await supabase.from('admins').update({ password: newPassword.trim() }).eq('id', id);
        } catch(e) {}
    }

    res.json({ success: true, message: 'Admin password reset successfully' });
};

app.put('/api/admins/:id/reset-password', handleResetPassword);
app.post('/api/admins/:id/reset-password', handleResetPassword);

app.delete('/api/admins/:id', async (req, res) => {
    const { id } = req.params;
    let username = '';
    let targetAdmin = null;

    if (supabase) {
        try {
            const { data } = await supabase.from('admins').select('*').eq('id', id).single();
            if (data) {
                targetAdmin = data;
                username = data.username;
            }
        } catch(e) {}
    }

    if (!targetAdmin) {
        const store = readStore();
        targetAdmin = store.admins.find(a => String(a.id) === String(id));
        if (targetAdmin) username = targetAdmin.username;
    }

    if (username === 'tejanarapareddy2@gmail.com') {
        return res.status(400).json({ error: 'Cannot delete the Primary Super Admin account (tejanarapareddy2@gmail.com).' });
    }

    let deletedFromSupabase = false;
    if (supabase) {
        try {
            const { error } = await supabase.from('admins').delete().eq('id', id);
            if (!error) {
                deletedFromSupabase = true;
            } else {
                console.error('Supabase admin delete error:', error.message);
            }
        } catch (e) {
            console.error('Supabase admin delete exception:', e.message);
        }
    }

    const store = readStore();
    const lenBefore = store.admins.length;
    store.admins = store.admins.filter(a => String(a.id) !== String(id));
    if (lenBefore !== store.admins.length) {
        saveStore(store);
    }

    if (supabase && !deletedFromSupabase && lenBefore === store.admins.length) {
        return res.status(404).json({ error: 'Admin account not found or could not be deleted.' });
    }

    await createNotification('🗑️ Admin Deleted', `Admin account "${username || id}" was deleted by Super Admin`, 'ADMIN');
    res.json({ success: true, message: `Admin account "${username || id}" deleted successfully.` });
});

// Helper: Notification generator
async function createNotification(title, message, type = 'GENERAL') {
    const notifObj = { title, message, type, created_at: new Date().toISOString() };
    if (supabase) {
        try { await supabase.from('notifications').insert([notifObj]); } catch (e) {}
    }
    const store = readStore();
    if (!store.notifications) store.notifications = [];
    const newId = store.notifications.length ? Math.max(...store.notifications.map(n => n.id || 0)) + 1 : 1;
    store.notifications.unshift({ id: newId, ...notifObj });
    saveStore(store);
}

// 12. Notifications API
app.get('/api/notifications', async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('notifications').select('*').order('id', { ascending: false }).limit(15);
            if (!error && data) return res.json({ success: true, notifications: data });
        } catch (e) {}
    }
    const store = readStore();
    res.json({ success: true, notifications: (store.notifications || []).slice(0, 15) });
});

app.post('/api/notifications', async (req, res) => {
    const { title, message, type } = req.body;
    if (!title || !message) return res.status(400).json({ error: 'Title and message required' });
    await createNotification(title.trim(), message.trim(), type || 'GENERAL');
    res.status(201).json({ success: true, message: 'Notification broadcast successfully' });
});

// 13. Export CSV API
app.get('/api/export/donations', async (req, res) => {
    let donations = [];
    if (supabase) {
        try {
            const { data } = await supabase.from('donations').select('*').order('id', { ascending: false });
            if (data && data.length) donations = data;
        } catch (e) {}
    }
    if (!donations.length) {
        const store = readStore();
        donations = store.donations || [];
    }

    let csvContent = 'Receipt Number,Donor Name,Mobile,Amount (INR),Payment Method,Sponsorship Title,Date,Collected By\n';
    donations.forEach(d => {
        const row = [
            `"${d.receipt_number || ''}"`,
            `"${(d.donor_name || '').replace(/"/g, '""')}"`,
            `"${d.mobile || ''}"`,
            d.amount || 0,
            `"${d.payment_method || 'Cash'}"`,
            `"${(d.sponsorship_title || '').replace(/"/g, '""')}"`,
            `"${d.date || ''}"`,
            `"${(d.collected_by || '').replace(/"/g, '""')}"`
        ].join(',');
        csvContent += row + '\n';
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="chandaa_donations_2026.csv"');
    res.status(200).send(csvContent);
});

// 10. Competitions & Winners API
app.get('/api/competitions', async (req, res) => {
    if (supabase) {
        try {
            const { data, error } = await supabase.from('competitions').select('*').order('id', { ascending: false });
            if (!error && data) return res.json({ success: true, competitions: data });
        } catch (e) {}
    }
    const store = readStore();
    res.json({ success: true, competitions: store.competitions || [] });
});

app.get('/api/competitions/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        try {
            const { data } = await supabase.from('competitions').select('*').eq('id', id).single();
            if (data) return res.json({ success: true, competition: data });
        } catch (e) {}
    }
    const store = readStore();
    const comp = (store.competitions || []).find(c => c.id === id);
    if (comp) return res.json({ success: true, competition: comp });
    res.status(404).json({ error: 'Competition record not found' });
});

app.post('/api/competitions', async (req, res) => {
    let createdComp = null;
    if (supabase) {
        try {
            const { data, error } = await supabase.from('competitions').insert([req.body]).select();
            if (!error && data) createdComp = data[0];
        } catch (e) {}
    }
    if (!createdComp) {
        const store = readStore();
        if (!store.competitions) store.competitions = [];
        const newId = store.competitions.length ? Math.max(...store.competitions.map(c => c.id || 0)) + 1 : 1;
        createdComp = { id: newId, ...req.body };
        store.competitions.push(createdComp);
        saveStore(store);
    }
    createNotification('🏆 Competition & Winner Announcement', `${req.body.game_name} - Winner: ${req.body.winner_name || 'Announced'} (Captain: ${req.body.captain_name || 'N/A'})`, 'COMPETITION');
    res.status(201).json({ success: true, competition: createdComp });
});

app.put('/api/competitions/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        try {
            const { data, error } = await supabase.from('competitions').update(req.body).eq('id', id).select();
            if (!error && data) return res.json({ success: true, competition: data[0] });
        } catch (e) {}
    }
    const store = readStore();
    if (!store.competitions) store.competitions = [];
    const idx = store.competitions.findIndex(c => c.id === id);
    if (idx !== -1) {
        store.competitions[idx] = { ...store.competitions[idx], ...req.body };
        saveStore(store);
        return res.json({ success: true, competition: store.competitions[idx] });
    }
    res.status(404).json({ error: 'Competition record not found' });
});

app.delete('/api/competitions/:id', async (req, res) => {
    const id = parseInt(req.params.id);
    if (supabase) {
        try {
            await supabase.from('competitions').delete().eq('id', id);
            return res.json({ success: true, message: 'Competition deleted' });
        } catch (e) {}
    }
    const store = readStore();
    if (!store.competitions) store.competitions = [];
    store.competitions = store.competitions.filter(c => c.id !== id);
    saveStore(store);
    res.json({ success: true, message: 'Competition record deleted successfully' });
});

// 11. Audit Logs API
app.get('/api/audit', (req, res) => {
    const store = readStore();
    res.json({ success: true, audit_logs: store.audit_logs });
});

// ----------------------------------------------------
// STATIC FRONTEND FILE ROUTING
// ----------------------------------------------------

// User website served on '/'
app.use('/', express.static(path.join(__dirname, 'frontend', 'user')));

// Admin portal served on '/admin'
app.use('/admin', express.static(path.join(__dirname, 'frontend', 'admin')));

// SPA Fallback Routes
app.get('/admin*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'admin', 'dashboard.html'));
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'user', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
============================================================
  ANANTHAMPALLI VILLAGE VINAYAKA CHAVITHI 2026 (AVVC 2026)
  Server running successfully at: http://localhost:${PORT}
  User Website:  http://localhost:${PORT}/
  Admin Portal:  http://localhost:${PORT}/admin/login.html
============================================================
        `);
    });
}

module.exports = app;
