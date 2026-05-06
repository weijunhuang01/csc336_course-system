const mysql = require('mysql2');

// Connection Config
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Enter your password here', // <-- Update this with your Workbench password
    database: 'student_registration'
});

console.log('🚀 Starting Full System Test...');

connection.connect(err => {
    if (err) throw err;

    // STEP 1: Test Registration Procedure
    // Enrolling Weijun Huang (101) into Modern Distributed Computing (901)
    connection.query('CALL RegisterStudent(101, 901)', (err, results) => {
        if (err) {
            console.error('❌ Registration Procedure Failed:', err.message);
            return connection.end();
        }
        console.log('✅ Step 1: Procedure executed successfully.');

        // STEP 2: Test the Schedule View
        // This confirms the JOIN logic and the enrollment record exist
        connection.query('SELECT * FROM View_Student_Schedules WHERE Student_ID = 101', (err, rows) => {
            if (err) {
                console.error('❌ View Retrieval Failed:', err.message);
            } else if (rows.length > 0) {
                console.log('✅ Step 2: Schedule View test passed.');
                console.table(rows); // Prints a nice table in your terminal
            } else {
                console.log('⚠️ Step 2: Connection worked, but no schedule found for this student.');
            }

            // STEP 3: Verify Invoice was created
            connection.query('SELECT * FROM Invoices WHERE Student_ID = 101', (err, invoices) => {
                if (!err && invoices.length > 0) {
                    console.log('✅ Step 3: Billing/Invoice system verified.');
                }
                
                console.log('🏁 Test Complete.');
                connection.end();
            });
        });
    });
});
