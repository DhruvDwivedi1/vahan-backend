const buildQuery = (intent, user) => {
  const { type, action, filters } = intent;
  let sql = '';
  let params = [];

  // Apply RBAC (Role-Based Access Control)
  const accessFilter = applyRBAC(user, filters);
  if (!accessFilter.allowed) {
    return { allowed: false, error: 'Access denied to requested data' };
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const lastMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const lastMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  try {
    switch (type) {
      case 'registration':
        sql = `SELECT COUNT(*) as count FROM vehicle_registrations vr 
               JOIN states s ON vr.state_id = s.id 
               WHERE 1=1`;
        
        if (accessFilter.state) {
          sql += ` AND LOWER(s.state_name) = LOWER($${params.length + 1})`;
          params.push(accessFilter.state);
        }
        
        if (accessFilter.district) {
          sql += ` AND vr.district_id = (SELECT id FROM districts WHERE LOWER(district_name) LIKE LOWER($${params.length + 1}) LIMIT 1)`;
          params.push(`%${accessFilter.district}%`);
        }

        // Time filters
        if (filters.year) {
          sql += ` AND EXTRACT(YEAR FROM registration_date) = $${params.length + 1}`;
          params.push(filters.year);
        }
        if (filters.month && filters.year) {
          sql += ` AND EXTRACT(MONTH FROM registration_date) = $${params.length + 1}`;
          params.push(filters.month);
        }
        if (filters.period === 'current_month') {
          sql += ` AND EXTRACT(YEAR FROM registration_date) = $${params.length + 1}`;
          sql += ` AND EXTRACT(MONTH FROM registration_date) = $${params.length + 2}`;
          params.push(currentYear, currentMonth);
        }
        if (filters.period === 'current_year') {
          sql += ` AND EXTRACT(YEAR FROM registration_date) = $${params.length + 1}`;
          params.push(currentYear);
        }
        if (filters.period === 'last_month') {
          sql += ` AND EXTRACT(YEAR FROM registration_date) = $${params.length + 1}`;
          sql += ` AND EXTRACT(MONTH FROM registration_date) = $${params.length + 2}`;
          params.push(lastMonthYear, lastMonth);
        }
        if (filters.period === 'last_year') {
          sql += ` AND EXTRACT(YEAR FROM registration_date) = $${params.length + 1}`;
          params.push(currentYear - 1);
        }
        
        if (filters.vehicleType) {
          sql += ` AND LOWER(vehicle_type) = LOWER($${params.length + 1})`;
          params.push(filters.vehicleType);
        }
        break;

      case 'sales':
        sql = `SELECT COUNT(*) as count FROM vehicle_sales vs 
               JOIN states s ON vs.state_id = s.id 
               WHERE 1=1`;
        
        if (accessFilter.state) {
          sql += ` AND LOWER(s.state_name) = LOWER($${params.length + 1})`;
          params.push(accessFilter.state);
        }

        if (accessFilter.district) {
          sql += ` AND vs.district_id = (SELECT id FROM districts WHERE LOWER(district_name) LIKE LOWER($${params.length + 1}) LIMIT 1)`;
          params.push(`%${accessFilter.district}%`);
        }

        if (filters.year) {
          sql += ` AND EXTRACT(YEAR FROM sale_date) = $${params.length + 1}`;
          params.push(filters.year);
        }
        if (filters.month && filters.year) {
          sql += ` AND EXTRACT(MONTH FROM sale_date) = $${params.length + 1}`;
          params.push(filters.month);
        }
        if (filters.period === 'current_month') {
          sql += ` AND EXTRACT(YEAR FROM sale_date) = $${params.length + 1}`;
          sql += ` AND EXTRACT(MONTH FROM sale_date) = $${params.length + 2}`;
          params.push(currentYear, currentMonth);
        }
        if (filters.period === 'current_year') {
          sql += ` AND EXTRACT(YEAR FROM sale_date) = $${params.length + 1}`;
          params.push(currentYear);
        }
        
        if (filters.vehicleType) {
          sql += ` AND LOWER(vehicle_type) = LOWER($${params.length + 1})`;
          params.push(filters.vehicleType);
        }
        break;

      case 'challans':
        if (action === 'top') {
          sql = `SELECT r.rto_name, SUM(tc.fine_amount) as total 
                 FROM traffic_challans tc 
                 JOIN states s ON tc.state_id = s.id
                 JOIN rto_offices r ON tc.rto_id = r.id 
                 WHERE 1=1`;
          
          if (accessFilter.state) {
            sql += ` AND LOWER(s.state_name) = LOWER($${params.length + 1})`;
            params.push(accessFilter.state);
          }
          
          if (filters.year) {
            sql += ` AND EXTRACT(YEAR FROM challan_date) = $${params.length + 1}`;
            params.push(filters.year);
          }
          
          sql += ` GROUP BY r.rto_name ORDER BY total DESC LIMIT 5`;
        } else {
          sql = `SELECT SUM(fine_amount) as total FROM traffic_challans tc 
                 JOIN states s ON tc.state_id = s.id 
                 WHERE 1=1`;
          
          if (accessFilter.state) {
            sql += ` AND LOWER(s.state_name) = LOWER($${params.length + 1})`;
            params.push(accessFilter.state);
          }
          
          if (accessFilter.district) {
            sql += ` AND tc.district_id = (SELECT id FROM districts WHERE LOWER(district_name) LIKE LOWER($${params.length + 1}) LIMIT 1)`;
            params.push(`%${accessFilter.district}%`);
          }
          
          if (filters.year) {
            sql += ` AND EXTRACT(YEAR FROM challan_date) = $${params.length + 1}`;
            params.push(filters.year);
          }
          if (filters.month && filters.year) {
            sql += ` AND EXTRACT(MONTH FROM challan_date) = $${params.length + 1}`;
            params.push(filters.month);
          }
          if (filters.period === 'current_month') {
            sql += ` AND EXTRACT(YEAR FROM challan_date) = $${params.length + 1}`;
            sql += ` AND EXTRACT(MONTH FROM challan_date) = $${params.length + 2}`;
            params.push(currentYear, currentMonth);
          }
        }
        break;

      case 'fine':
        sql = `SELECT fine_amount, description FROM traffic_fines tf
               JOIN states s ON tf.state_id = s.id
               WHERE LOWER(violation_type) = LOWER($${params.length + 1})`;
        params.push(filters.violation);
        
        if (accessFilter.state || filters.state) {
          sql += ` AND LOWER(s.state_name) = LOWER($${params.length + 1})`;
          params.push(accessFilter.state || filters.state);
        } else {
          sql += ` LIMIT 1`;
        }
        break;

      case 'accident':
        sql = `SELECT COUNT(*) as count FROM accident_records ar
               JOIN states s ON ar.state_id = s.id
               WHERE 1=1`;
        
        if (accessFilter.state) {
          sql += ` AND LOWER(s.state_name) = LOWER($${params.length + 1})`;
          params.push(accessFilter.state);
        }
        
        if (filters.year) {
          sql += ` AND EXTRACT(YEAR FROM accident_date) = $${params.length + 1}`;
          params.push(filters.year);
        }
        if (filters.period === 'current_year') {
          sql += ` AND EXTRACT(YEAR FROM accident_date) = $${params.length + 1}`;
          params.push(currentYear);
        }
        break;

      case 'license':
        sql = `SELECT COUNT(*) as count FROM driving_licenses dl
               JOIN states s ON dl.state_id = s.id
               WHERE 1=1`;
        
        if (accessFilter.state) {
          sql += ` AND LOWER(s.state_name) = LOWER($${params.length + 1})`;
          params.push(accessFilter.state);
        }
        
        if (filters.year) {
          sql += ` AND EXTRACT(YEAR FROM issue_date) = $${params.length + 1}`;
          params.push(filters.year);
        }
        break;

      default:
        return { allowed: false, error: 'Unknown query type' };
    }

    return { sql, params, allowed: true };
    
  } catch (error) {
    console.error('Query builder error:', error);
    return { allowed: false, error: 'Error building query' };
  }
};

const applyRBAC = (user, filters) => {
  const result = { allowed: true };

  switch (user.role) {
    case 'admin':
      // Admin can access everything
      result.state = filters.state || null;
      result.district = filters.district || null;
      break;

    case 'state_officer':
      // State officer can only access their state
      result.state = user.state;
      if (filters.state && filters.state.toLowerCase() !== user.state.toLowerCase()) {
        return { allowed: false };
      }
      result.district = filters.district || null;
      break;

    case 'district_officer':
      // District officer can only access their district
      result.state = user.state;
      result.district = user.district;
      if (filters.state && filters.state.toLowerCase() !== user.state.toLowerCase()) {
        return { allowed: false };
      }
      if (filters.district && filters.district.toLowerCase() !== user.district.toLowerCase()) {
        return { allowed: false };
      }
      break;

    case 'rto_clerk':
      // RTO clerk can only access their specific RTO
      result.state = user.state;
      result.district = user.district;
      result.rto = user.rto_office;
      if (filters.state && filters.state.toLowerCase() !== user.state.toLowerCase()) {
        return { allowed: false };
      }
      if (filters.district && filters.district.toLowerCase() !== user.district.toLowerCase()) {
        return { allowed: false };
      }
      break;

    default:
      return { allowed: false };
  }

  return result;
};

module.exports = { buildQuery };