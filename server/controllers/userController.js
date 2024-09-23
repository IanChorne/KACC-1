const sql = require('mssql');
const bcrypt = require('bcrypt');
const saltRounds = 10;

//helper function to check password age
const isPasswordExpired = (passwordCreatedAt) => {
  const createdDate = new Date(passwordCreatedAt);
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  console.log("Password Created At:", passwordCreatedAt);
  console.log("90 Days Ago:", ninetyDaysAgo);
  console.log("Is Password Expired:", createdDate < ninetyDaysAgo);

  return createdDate < ninetyDaysAgo;
};



// login logic
exports.login = async (pool, username, password) => {
  const userQuery = `
    SELECT * FROM users 
    WHERE username = @username 
  `;
  const result = await pool.request()
    .input('username', sql.VarChar, username)
    .query(userQuery);

  if (result.recordset.length > 0) {
    const user = result.recordset[0];

    //grab users current password
    const passwordQuery = `
    SELECT  p.password_hash, r.role_name
    FROM user_passwords p
    JOIN user_roles ur ON p.user_id = ur.user_id
    JOIN roles r ON ur.role_id = r.role_id
    WHERE p.user_id = @userId AND is_current = 1
    `;
    const passwordResult = await pool.request()
      .input('userId', sql.Int, user.user_id)
      .query(passwordQuery);

    if (passwordResult.recordset.length > 0) {
      const currentPassword = passwordResult.recordset[0];

      // Compare the entered password with the hashed password from the database
      const passwordMatch = await bcrypt.compare(password, currentPassword.password_hash);

      if (!passwordMatch) {
        throw new Error('Invalid username or password');
      }
      // Check if the password is older than 90 days
      if (isPasswordExpired(currentPassword.created_at)) {
        throw new Error ('Password is Expired');
      }
      //Need a way for the user to create a new password if their current is out of date
      //when changing passwords set the old password to expired

  // If password is valid and not expired, return the user data
    return result.recordset[0];
    } else {
    throw new Error('No current password found');
    } 
  } else {
    throw new Error('Invalid username or password');
  }
};

// creating a new account
exports.createAccount = async (pool, userData) => {
  const { firstName, lastName, username, password, email } = userData;

  // Check if the username or email already exists
  const checkUserQuery = `
    SELECT * FROM users WHERE username = @username OR email = @Email
  `;
  const checkUserResult = await pool.request()
    .input('username', sql.VarChar, username)
    .input('Email', sql.VarChar, email)
    .query(checkUserQuery);

  if (checkUserResult.recordset.length > 0) {
    throw new Error('Username or email already exists');
  }

  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Insert new user
  const insertUserQuery = `
    INSERT INTO users (first_name, last_name, username, email)
    VALUES (@firstName, @lastName, @username, @Email);
    SELECT SCOPE_IDENTITY() AS user_id;  -- Get the newly inserted user_id
  `;

  const insertUserResult = await pool.request()
    .input('firstName', sql.VarChar, firstName)
    .input('lastName', sql.VarChar, lastName)
    .input('username', sql.VarChar, username)
    .input('Email', sql.VarChar, email)
    .query(insertUserQuery);

    //now instert the password into the user_passwords table
    //get the new user_id
    const newUserId = insertUserResult.recordset[0].user_id;

    //instert password
    const insertPasswordQuery = `
      INSERT INTO user_passwords (user_id, password_hash, is_current)
      VALUES (@userId, @hashedPassword, 1);
    `;

    await pool.request()
      .input('userId', sql.Int, newUserId)
      .input('hashedPassword', sql.VarChar, hashedPassword)
      .query(insertPasswordQuery);


    //insert roles query default role will be accountant admins can change this
    const insertRoleQuery = `
      INSERT INTO user_roles (user_id, role_id)
      VALUES (@userId, 3);
    `;

    await pool.request()
      .input('userId', sql.Int, newUserId)
      .query(insertRoleQuery);

    return { message: 'User created successfully', userId: newUserId };
  };
