const mysql = require('mysql2/promise');
var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'dogwalkservice'
};


app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT Dogs.name AS dog_name, Dogs.size, Users.username AS owner_username
      FROM Dogs
      JOIN Users ON Dogs.owner_id = Users.user_id
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});


app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT WalkRequests.request_id, Dogs.name AS dog_name, WalkRequests.requested_time, 
             WalkRequests.duration_minutes, WalkRequests.location, Users.username AS owner_username
      FROM WalkRequests
      JOIN Dogs ON WalkRequests.dog_id = Dogs.dog_id
      JOIN Users ON Dogs.owner_id = Users.user_id
      WHERE WalkRequests.status = 'open'
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});


app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        Users.username AS walker_username,
        COUNT(WalkRatings.rating_id) AS total_ratings,
        ROUND(AVG(WalkRatings.rating), 1) AS average_rating,
        (
          SELECT COUNT(*) 
          FROM WalkRequests AS wr
          JOIN WalkApplications AS wa ON wr.request_id = wa.request_id
          WHERE wr.status = 'completed' AND wa.walker_id = Users.user_id AND wa.status = 'accepted'
        ) AS completed_walks
      FROM Users
      LEFT JOIN WalkRatings ON Users.user_id = WalkRatings.walker_id
      WHERE Users.role = 'walker'
      GROUP BY Users.user_id, Users.username
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch walker summary' });
  }
});


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


module.exports = app;