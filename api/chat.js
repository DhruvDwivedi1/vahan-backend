const express = require('express');
const pool = require('../db/db');
const authMiddleware = require('../middleware/auth');
const { parseIntent } = require('../utils/intentParser');
const { buildQuery } = require('../utils/queryBuilder');
const { formatResponse } = require('../utils/responseFormatter');

const router = express.Router();

// All chat routes require authentication
router.use(authMiddleware);

// Main chat endpoint
router.post('/', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { message } = req.body;
    const user = req.user;

    // Validate message
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ reply: 'Invalid message format. Please send a text query.' });
    }

    // Sanitize and limit message length
    const sanitizedMessage = message.trim().substring(0, 500);

    if (sanitizedMessage.length < 3) {
      return res.status(400).json({ reply: 'Query too short. Please provide more details.' });
    }

    console.log(`📝 Query from ${user.username}: "${sanitizedMessage}"`);

    // Parse intent from message
    const intent = parseIntent(sanitizedMessage);

    if (!intent.recognized) {
      await logQuery(user.id, sanitizedMessage, null, 'Intent not recognized', false, startTime);
      
      return res.json({ 
        reply: "❓ I couldn't understand your query. Please ask about:\n\n" +
               "📊 Vehicle Registrations:\n" +
               "  • 'How many cars registered in UP in March 2023?'\n" +
               "  • 'Total vehicles registered in Lucknow this month'\n\n" +
               "💰 Vehicle Sales:\n" +
               "  • 'How many vehicles sold in Maharashtra this year?'\n" +
               "  • 'Total cars sold in Mumbai in 2024'\n\n" +
               "🚔 Traffic Challans:\n" +
               "  • 'Which RTO collected highest challans?'\n" +
               "  • 'Total challan collection in Delhi this month'\n\n" +
               "⚖️ Traffic Fines:\n" +
               "  • 'What is the fine for not wearing helmet in Delhi?'\n" +
               "  • 'Fine for overspeeding in Maharashtra'\n\n" +
               "🚨 Accidents:\n" +
               "  • 'Total accidents in Tamil Nadu in 2024'\n\n" +
               "📋 Driving Licenses:\n" +
               "  • 'How many licenses issued in Karnataka in 2023?'"
      });
    }

    console.log(`🎯 Intent recognized: ${intent.type} (${intent.action})`);

    // Build SQL query based on intent and user permissions
    const queryResult = buildQuery(intent, user);

    if (!queryResult.allowed) {
      await logQuery(user.id, sanitizedMessage, null, queryResult.error || 'Access denied', false, startTime);
      
      return res.status(403).json({ 
        reply: '🔒 Access denied. You do not have permission to view this data.\n\n' +
               `Your access level: ${user.role}\n` +
               `Your region: ${user.state || 'All India'}${user.district ? ' - ' + user.district : ''}`
      });
    }

    // Execute database query
    console.log(`🔍 Executing query...`);
    const dbResult = await pool.query(queryResult.sql, queryResult.params);

    // Format response
    const reply = formatResponse(intent, dbResult.rows);

    // Log successful query
    await logQuery(user.id, sanitizedMessage, queryResult.sql, reply, true, startTime);

    const responseTime = Date.now() - startTime;
    console.log(`✅ Query completed in ${responseTime}ms`);

    res.json({ reply });

  } catch (error) {
    console.error('❌ Chat error:', error);
    
    const errorMessage = process.env.NODE_ENV === 'production' 
      ? 'An error occurred processing your request. Please try again.'
      : `Error: ${error.message}`;
    
    // Log error
    try {
      await logQuery(req.user.id, req.body.message, null, errorMessage, false, startTime);
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }

    res.status(500).json({ reply: errorMessage });
  }
});

// Function to log queries to database
async function logQuery(userId, queryText, sql, response, success, startTime) {
  try {
    const responseTime = Date.now() - startTime;
    
    await pool.query(
      `INSERT INTO chatbot_logs (user_id, query_text, executed_sql, response_text, success, response_time_ms) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, queryText, sql, response, success, responseTime]
    );
  } catch (err) {
    console.error('❌ Failed to log query:', err.message);
  }
}

// Analytics endpoint (admin only)
router.get('/analytics', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(`
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as total_queries,
        COUNT(CASE WHEN success THEN 1 END) as successful_queries,
        AVG(response_time_ms) as avg_response_time
      FROM chatbot_logs
      WHERE timestamp > NOW() - INTERVAL '7 days'
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `);

    res.json({ analytics: result.rows });
  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

module.exports = router;