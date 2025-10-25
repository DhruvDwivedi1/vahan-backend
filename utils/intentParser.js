const parseIntent = (message) => {
  const msg = message.toLowerCase();

  // Vehicle registrations
  if (msg.match(/how many.*register/i) || msg.match(/total.*registration/i) || msg.match(/registered.*vehicle/i)) {
    return {
      recognized: true,
      type: 'registration',
      action: 'count',
      filters: extractFilters(msg)
    };
  }

  // Vehicle sales
  if (msg.match(/how many.*sold/i) || msg.match(/total.*sales/i) || msg.match(/vehicle.*sale/i) || msg.match(/sold.*vehicle/i)) {
    return {
      recognized: true,
      type: 'sales',
      action: 'count',
      filters: extractFilters(msg)
    };
  }

  // Challans - Top performers
  if (msg.match(/challan/i) && msg.match(/highest|top|most|maximum/i)) {
    return {
      recognized: true,
      type: 'challans',
      action: 'top',
      filters: extractFilters(msg)
    };
  }

  // Challans - Total collection
  if (msg.match(/challan|collected|fine.*collect/i)) {
    return {
      recognized: true,
      type: 'challans',
      action: 'total',
      filters: extractFilters(msg)
    };
  }

  // Fine lookup
  if (msg.match(/fine.*for|what.*fine|penalty.*for|challan.*for/i)) {
    return {
      recognized: true,
      type: 'fine',
      action: 'lookup',
      filters: extractFilters(msg)
    };
  }

  // Accidents
  if (msg.match(/accident/i)) {
    return {
      recognized: true,
      type: 'accident',
      action: 'count',
      filters: extractFilters(msg)
    };
  }

  // Licenses
  if (msg.match(/license|licence|dl issued/i)) {
    return {
      recognized: true,
      type: 'license',
      action: 'count',
      filters: extractFilters(msg)
    };
  }

  return { recognized: false };
};

const extractFilters = (msg) => {
  const filters = {};

  // Extract state
  const statePatterns = {
    'uttar pradesh': ['uttar pradesh', ' up ', 'u.p.', 'u.p ', ' up,', ' up.'],
    'maharashtra': ['maharashtra', ' mh ', 'mh,', 'mh.'],
    'tamil nadu': ['tamil nadu', ' tn ', 'tn,', 'tn.'],
    'delhi': ['delhi', ' dl ', 'dl,', 'dl.', 'ncr'],
    'karnataka': ['karnataka', ' ka ', 'ka,', 'ka.'],
    'gujarat': ['gujarat', ' gj ', 'gj,', 'gj.'],
    'rajasthan': ['rajasthan', ' rj ', 'rj,', 'rj.'],
    'west bengal': ['west bengal', ' wb ', 'wb,', 'wb.', 'bengal'],
    'madhya pradesh': ['madhya pradesh', ' mp ', 'mp,', 'mp.'],
    'haryana': ['haryana', ' hr ', 'hr,', 'hr.']
  };

  for (const [state, patterns] of Object.entries(statePatterns)) {
    if (patterns.some(p => msg.includes(p))) {
      filters.state = state;
      break;
    }
  }

  // Extract district
  const districts = [
    'lucknow', 'kanpur', 'noida', 'agra', 'varanasi', 'ghaziabad', 'meerut', 'allahabad',
    'mumbai', 'pune', 'nagpur', 'thane', 'nashik', 'aurangabad',
    'chennai', 'coimbatore', 'madurai', 'tiruchirappalli', 'salem',
    'central delhi', 'east delhi', 'west delhi', 'north delhi', 'south delhi'
  ];
  
  for (const district of districts) {
    if (msg.includes(district)) {
      filters.district = district;
      break;
    }
  }

  // Extract time period - Month names
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june', 
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  
  monthNames.forEach((month, index) => {
    if (msg.includes(month)) {
      filters.month = index + 1;
    }
  });

  // Extract year
  const yearMatch = msg.match(/20(2[0-5])/);
  if (yearMatch) {
    filters.year = parseInt(yearMatch[0]);
  }

  // Extract relative time periods
  if (msg.includes('this month')) {
    filters.period = 'current_month';
  } else if (msg.includes('this year')) {
    filters.period = 'current_year';
  } else if (msg.includes('last month')) {
    filters.period = 'last_month';
  } else if (msg.includes('last year')) {
    filters.period = 'last_year';
  }

  // Extract vehicle type
  const vehicleTypes = {
    'car': ['car', 'cars'],
    'motorcycle': ['motorcycle', 'bike', 'bikes', 'two wheeler', 'two-wheeler'],
    'suv': ['suv', 'suvs'],
    'truck': ['truck', 'trucks'],
    'bus': ['bus', 'buses'],
    'auto rickshaw': ['auto', 'rickshaw', 'auto rickshaw']
  };

  for (const [type, patterns] of Object.entries(vehicleTypes)) {
    if (patterns.some(p => msg.includes(p))) {
      filters.vehicleType = type;
      break;
    }
  }

  // Extract violation type
  const violations = {
    'No Helmet': ['helmet', 'without helmet'],
    'No Seatbelt': ['seatbelt', 'seat belt', 'without seatbelt'],
    'Overspeeding': ['overspeeding', 'speed', 'speeding', 'over speed'],
    'Red Light Jump': ['red light', 'signal jump', 'traffic signal'],
    'Drunk Driving': ['drunk', 'drinking', 'alcohol', 'dui'],
    'Using Mobile': ['mobile', 'phone', 'cell phone'],
    'No Insurance': ['insurance', 'without insurance'],
    'No License': ['license', 'licence', 'without license', 'driving license'],
    'Triple Riding': ['triple riding', 'three on bike'],
    'Wrong Side Driving': ['wrong side', 'wrong way']
  };

  for (const [violation, patterns] of Object.entries(violations)) {
    if (patterns.some(p => msg.includes(p))) {
      filters.violation = violation;
      break;
    }
  }

  return filters;
};

module.exports = { parseIntent };