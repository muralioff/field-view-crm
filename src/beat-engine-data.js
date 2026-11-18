/* ============================================================
   Beat Engine — mock org data
   Stands in for what the CRM would supply: Company Details, the
   org's users / groups / roles, each module's fields for criteria,
   and the Frequency picklist.
   ============================================================ */
window.BEData = (function () {
  /* Company Details. A fact the org has not set reads "Not set". */
  const COMPANY = {
    businessDays: 'Mon – Fri',
    businessHours: '09:00 AM – 07:00 PM',
    timeZone: 'GMT +05:30 (IST)',
  };

  const USERS = [
    { id: 'u1',  name: 'Patricia Boyle',  email: 'patricia.boyle@zylker.com' },
    { id: 'u2',  name: 'Arjun Mehta',     email: 'arjun.mehta@zylker.com' },
    { id: 'u3',  name: 'Kavya Raman',     email: 'kavya.raman@zylker.com' },
    { id: 'u4',  name: 'Daniel Okafor',   email: 'daniel.okafor@zylker.com' },
    { id: 'u5',  name: 'Meera Iyer',      email: 'meera.iyer@zylker.com' },
    { id: 'u6',  name: 'Lucas Ferreira',  email: 'lucas.ferreira@zylker.com' },
    { id: 'u7',  name: 'Sana Qureshi',    email: 'sana.qureshi@zylker.com' },
    { id: 'u8',  name: 'Rahul Nair',      email: 'rahul.nair@zylker.com' },
    { id: 'u9',  name: 'Emily Clarke',    email: 'emily.clarke@zylker.com' },
    { id: 'u10', name: 'Vikram Sethi',    email: 'vikram.sethi@zylker.com' },
    { id: 'u11', name: 'Aisha Bello',     email: 'aisha.bello@zylker.com' },
    { id: 'u12', name: 'Tomás Rivera',    email: 'tomas.rivera@zylker.com' },
  ];

  /* Group → member user ids */
  const GROUPS = {
    'Sales Group':  ['u1', 'u2', 'u3', 'u4', 'u5'],
    'North Zone':   ['u6', 'u7', 'u8'],
    'Key Accounts': ['u2', 'u9', 'u10'],
    'Merchandising Team': [],
  };

  /* Role → member user ids */
  const ROLES = {
    'Field Sales Executive': ['u1', 'u3', 'u6', 'u8', 'u11'],
    'Area Sales Manager':    ['u4', 'u10'],
    'Merchandiser':          ['u7', 'u12'],
  };

  /* Fields each module offers to criteria. A module without an entry
     stands for one whose field metadata fails to load. */
  const MODULE_FIELDS = {
    Accounts: ['Account Name', 'Classification', 'Outlet Type', 'Industry', 'Billing City', 'Annual Revenue', 'Account Owner'],
    Contacts: ['Contact Name', 'Lead Source', 'Mailing City', 'Contact Owner', 'Department'],
    Deals:    ['Deal Name', 'Stage', 'Amount', 'Closing Date', 'Deal Owner', 'Required Skills'],
    Leads:    ['Lead Name', 'Lead Status', 'Lead Source', 'City', 'Lead Owner'],
  };

  /* User fields for "Users matching certain conditions" */
  const USER_FIELDS = ['Role', 'Territory', 'Department', 'City', 'Skills', 'Language'];

  const OPERATORS = ['is', 'is not', 'contains', 'starts with', '>', '<', 'is empty', 'is not empty'];
  const VALUELESS = new Set(['is empty', 'is not empty']);

  /* Planner_Frequency_Rules.Frequency picklist */
  const FREQUENCIES = ['Daily', 'Weekly', 'Bi-Weekly', 'Monthly'];

  const userById = id => USERS.find(u => u.id === id);
  const initials = name => name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();

  return {
    COMPANY, USERS, GROUPS, ROLES, MODULE_FIELDS, USER_FIELDS,
    OPERATORS, VALUELESS, FREQUENCIES, userById, initials,
  };
})();
