const formatResponse = (intent, data) => {
  const { type, action, filters } = intent;

  if (!data || data.length === 0) {
    return 'No data found for your query. Please try different parameters.';
  }

  try {
    switch (type) {
      case 'registration':
        const count = parseInt(data[0].count);
        let response = `📊 Total ${count.toLocaleString()} vehicle${count !== 1 ? 's' : ''} registered`;
        
        if (filters.vehicleType) {
          const vehicleType = filters.vehicleType.charAt(0).toUpperCase() + filters.vehicleType.slice(1);
          response = `📊 Total ${count.toLocaleString()} ${vehicleType}${count !== 1 ? 's' : ''} registered`;
        }
        
        if (filters.state) {
          const stateName = filters.state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          response += ` in ${stateName}`;
        }
        
        if (filters.district) {
          const districtName = filters.district.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          response += ` (${districtName} district)`;
        }
        
        if (filters.year && filters.month) {
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          response += ` in ${months[filters.month - 1]} ${filters.year}`;
        } else if (filters.year) {
          response += ` in ${filters.year}`;
        } else if (filters.period === 'current_month') {
          response += ` this month`;
        } else if (filters.period === 'current_year') {
          response += ` this year`;
        } else if (filters.period === 'last_month') {
          response += ` last month`;
        } else if (filters.period === 'last_year') {
          response += ` last year`;
        }
        
        return response + '.';

      case 'sales':
        const salesCount = parseInt(data[0].count);
        let salesResponse = `💰 Total ${salesCount.toLocaleString()} vehicle${salesCount !== 1 ? 's' : ''} sold`;
        
        if (filters.vehicleType) {
          const vehicleType = filters.vehicleType.charAt(0).toUpperCase() + filters.vehicleType.slice(1);
          salesResponse = `💰 Total ${salesCount.toLocaleString()} ${vehicleType}${salesCount !== 1 ? 's' : ''} sold`;
        }
        
        if (filters.state) {
          const stateName = filters.state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          salesResponse += ` in ${stateName}`;
        }
        
        if (filters.period === 'current_month') {
          salesResponse += ` this month`;
        } else if (filters.period === 'current_year') {
          salesResponse += ` this year`;
        } else if (filters.year) {
          salesResponse += ` in ${filters.year}`;
        }
        
        return salesResponse + '.';

      case 'challans':
        if (action === 'top') {
          let topResponse = '🏆 Top RTOs by Challan Collection:\n\n';
          data.forEach((row, index) => {
            const amount = parseFloat(row.total);
            const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '📍';
            topResponse += `${emoji} ${row.rto_name}: ₹${(amount / 100000).toFixed(2)} Lakh\n`;
          });
          return topResponse.trim();
        } else {
          const total = parseFloat(data[0].total || 0);
          let challanResponse = `🚔 Total challan collection: ₹${(total / 100000).toFixed(2)} Lakh`;
          
          if (filters.state) {
            const stateName = filters.state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            challanResponse += ` in ${stateName}`;
          }
          
          if (filters.year && filters.month) {
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            challanResponse += ` (${months[filters.month - 1]} ${filters.year})`;
          } else if (filters.year) {
            challanResponse += ` (${filters.year})`;
          } else if (filters.period === 'current_month') {
            challanResponse += ` (This month)`;
          }
          
          return challanResponse + '.';
        }

      case 'fine':
        const fineAmount = data[0]?.fine_amount;
        if (fineAmount) {
          let fineResponse = `⚖️ Fine for ${filters.violation}`;
          if (filters.state) {
            const stateName = filters.state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            fineResponse += ` in ${stateName}`;
          }
          fineResponse += ` is ₹${parseFloat(fineAmount).toLocaleString()}.`;
          
          if (data[0].description) {
            fineResponse += `\n\n📝 ${data[0].description}`;
          }
          
          return fineResponse;
        }
        return '⚠️ Fine information not available for this violation and state.';

      case 'accident':
        const accidentCount = parseInt(data[0].count);
        let accidentResponse = `🚨 Total ${accidentCount.toLocaleString()} accident${accidentCount !== 1 ? 's' : ''} recorded`;
        
        if (filters.state) {
          const stateName = filters.state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          accidentResponse += ` in ${stateName}`;
        }
        if (filters.year) {
          accidentResponse += ` in ${filters.year}`;
        } else if (filters.period === 'current_year') {
          accidentResponse += ` this year`;
        }
        
        return accidentResponse + '.';

      case 'license':
        const licenseCount = parseInt(data[0].count);
        let licenseResponse = `📋 Total ${licenseCount.toLocaleString()} driving license${licenseCount !== 1 ? 's' : ''} issued`;
        
        if (filters.state) {
          const stateName = filters.state.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
          licenseResponse += ` in ${stateName}`;
        }
        if (filters.year) {
          licenseResponse += ` in ${filters.year}`;
        }
        
        return licenseResponse + '.';

      default:
        return 'Unable to format response for this query type.';
    }
  } catch (error) {
    console.error('Response formatter error:', error);
    return 'Error formatting response. Please try again.';
  }
};

module.exports = { formatResponse };