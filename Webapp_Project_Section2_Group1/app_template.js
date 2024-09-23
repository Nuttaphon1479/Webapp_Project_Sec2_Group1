const express = require('express');
const path = require('path');
const bcrypt = require("bcrypt");
const con = require('./config/db');
const session = require('express-session');
const memorystore = require('memorystore')(session);
const app = express();

const multer = require('multer');
// ตั้งค่า Multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/img/'); // กำหนดโฟลเดอร์ที่ไฟล์จะถูกบันทึก
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// set the public folder
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    cookie: { maxAge: 24 * 60 * 60 * 1000 },
    secret: 'Todayistooearlytolearn',
    resave: false,
    saveUninitialized: true,
    store: new memorystore({
        checkPeriod: 24 * 60 * 60 * 1000
    })
}));

// ============ Register/Login =================
app.get('/register', function (_req, res) {
    res.sendFile(path.join(__dirname, 'views/register-project.html'))
});

app.get('/login', function (_req, res) {
    res.sendFile(path.join(__dirname, 'views/login-project.html'))
});

app.post('/register', function (req, res) {
    const { name, username, password, repassword } = req.body
    if (password != repassword) {
        return res.status(401).send('Password not match');
    }
    bcrypt.hash(password, 10, function (err, hash) {
        if (err) {
            res.status(500).send('Hash error');
        } else {
            const findusername = "SELECT username FROM user WHERE username =?"
            con.query(findusername, [username], function (err, results) {
                if (err) {
                    console.error(err);
                    res.status(500).send('DB error')
                } else if (results.length > 0) {
                    res.status(401).send('Username has already exist')
                } else {
                    const sql = "INSERT INTO user(name,username,password,role) VALUE(?,?,?,'borrower')"
                    con.query(sql, [name, username, hash], function (err, results) {
                        if (err) {
                            console.error(err);
                            res.status(500).send('DB error')
                        } else {
                            res.send('/')
                        }
                    })
                }
            })
        }
    })
});

app.post('/login', function (req, res) {
    const { username, password } = req.body;
    // const sql = "SELECT id,username,role FROM user WHERE username = ? AND password = ? ";
    const sql = "SELECT * FROM user WHERE username=?";
    con.query(sql, [username], function (err, results) {
        if (err) {
            console.error(err);
            res.status(500).send('DB error')
        } else if (results.length != 1) {
            res.status(401).send('Wrong username')
        } else {
            // compare raw with hashed passwords
            bcrypt.compare(password, results[0].password,
                function (err, same) {
                    if (err) {
                        res.status(500).send('Password error')
                    } else {
                        if (same) {
                            req.session.name = results[0].name;
                            req.session.username = results[0].username;
                            req.session.userid = results[0].userid;
                            req.session.role = results[0].role;
                            res.send('/borrower/itemlist');
                        }
                        else {
                            res.status(401).send('Wrong password');
                        }
                    }
                });
        }
    });
});

// Staff username:test2 password:B1234 , Owner username:test3 password:C1234

// ------------- logout --------------
app.get('/logout', function (req, res) {
    req.session.destroy(function (err) {
        if (err) {
            return res.status(500).send('Session error');
        }
        res.redirect('/');
    })
});

// Call id,name,username,role
app.get('/user', function (req, res) {
    // res.send(req.session.username);
    res.json({ "userid": req.session.userid, "name": req.session.name, "username": req.session.username, "role": req.session.role });
});



// ============ Page routes =================

// ============ Dashboard =================
// Dashboard 3 Card
app.get('/assets/:status', (req, res) => {
    const status = req.params.status;
    const validStatuses = ['available', 'disabled', 'borrowed'];

    if (!validStatuses.includes(status)) {
        return res.status(400).send('Invalid status');
    }

    const query = `SELECT * FROM asset WHERE status = "${status}"`;

    con.query(query, (err, results) => {
        if (err) {
            console.error('Error querying MySQL:', err);
            return res.status(500).send('Internal Server Error');
        }

        res.json(results);
    });
});

// Dhounut Chart
app.get('/asset', function (req, res) {
    const sql = "SELECT COUNT(*) AS count, status FROM asset GROUP BY status";
    con.query(sql, function (err, results) {
        if (err) {
            console.error(err);
            res.status(500).send('DB error');
        } else {
            const pieChartData = {
                labels: results.map(result => result.status),
                datasets: [{
                    data: results.map(result => result.count),
                    backgroundColor: ['green', '#e74a3b', '#f6c23e'],
                }]
            };
            res.json(pieChartData); // Send the JSON response here
        }
    });
});

// ============ Borrower =================
app.get('/borrower', function (req, res) {
    if (req.session.role == 'borrower') {
        res.sendFile(path.join(__dirname, 'views/UI/User/dashboardUser.html'))
    }
    else {
        res.redirect('/');
    }
});

app.get('/assetuser', function (req, res) {
    // if (req.session.role == 'borrower') {
        const sql = "SELECT * FROM asset";
        //const sql = "SELECT asset.*, borrowingrequest.* FROM asset LEFT JOIN borrowingrequest ON asset.assetid = borrowingrequest.assetid";
        con.query(sql, function (err, results) {
            if (err) {
                console.error(err);
                res.status(500).send('DB error');
            }
            else {
                // res.status(200).send("Update successfully");
                res.status(200).json(results);
            }
        });
    }
    // else {
    //     res.redirect('/');
    // } }
);

app.get('/checkuser', function (req, res) {
    // if (req.session.role == 'borrower') {

        // const sql =`SELECT asset.assetid, asset.assetimage FROM asset FULL OUTER JOIN borrowingrequest ON asset.assetid = borrowingrequest.assetid `;
        const sql = `SELECT asset.assetimage,asset.assetname, borrowingrequest.borrowerid, borrowingrequest.borrowingdate, borrowingrequest.returndate, borrowingrequest.approverby, borrowingrequest.status, borrowingrequest.messageText, borrowingrequest.userborrowID FROM asset LEFT JOIN borrowingrequest ON asset.assetid = borrowingrequest.assetid`;

        con.query(sql, function (err, results) {
            if (err) {
                console.error(err);
                res.status(500).send('DB error');
            }
            else {
                res.status(200).json(results);
            }
        });
    // }
    // else {
    //     res.redirect('/');
    // }
});


// Show itemlist
app.get('/borrower/itemlist', function (req, res) {
    if (req.session.role == 'borrower') {
        res.sendFile(path.join(__dirname, 'views/UI/User/Mainuser.html'))
    }
    else {
        res.redirect('/');
    }
});


//request
app.post("/assetrequest", function (req, res) {
    // const assetid = req.params.id;
    //const borrowerid = req.params.id;
    const borrowAsset = req.body;

    const sql = "INSERT INTO borrowingrequest SET ?";
    console.log(sql, borrowAsset);
    con.query(sql, borrowAsset, function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        if (results.affectedRows != 1) {
            console.error('Row added is not 1');
            return res.status(500).send("Add failed");
        }
        res.json({ success: true, message: "Add successfully" });
    });
});

// Update asset status from available to borrowed
app.put("/assetrequest", function (req, res) {
    const updateProduct = req.body;
    const assetid = updateProduct.assetid;

    if (!assetid) {
        console.error('Asset ID is missing in the update request');
        return res.status(400).send("Bad request. Missing asset ID for update");
    }

    const sql = "UPDATE asset SET ? WHERE assetid = ?";
    con.query(sql, [updateProduct, assetid], function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        if (results.affectedRows !== 1) {
            console.error('Row updated is not 1');
            return res.status(500).send("Update failed");
        }
        res.status(200).send("Update successfully");
    });
});



app.get('/borrower/checkstatus', function (req, res) {
    if (req.session.role == 'borrower') {
        res.sendFile(path.join(__dirname, 'views/UI/User/checkstatususer.html'))
    }
    else {
        res.redirect('/');
    }
});



// ============ Staff =================
app.get('/staff', function (req, res) {
    if (req.session.role == 'staff') {
        res.sendFile(path.join(__dirname, 'views/UI/Staff/dashboardStaff.html'))
    }
    else {
        res.redirect('/');
    }
});

app.get('/assetstaff', function (req, res) {
    // if (req.session.role == 'staff') {
        const sql = "SELECT * FROM asset";
        con.query(sql, function (err, results) {
            if (err) {
                console.error(err);
                res.status(500).send('DB error');
            }
            else {
                res.status(200).json(results);
            }
        });
    }
//     else {
//         res.redirect('/');
//     }
// }
);


app.delete("/assetstaff/:id", function (req, res) {
    const assetid = req.params.id;

    //เพิ่มมา
    if (!assetid) {
        return res.status(400).send("Bad request. Missing asset ID for deletion");
    }

    const sql = "DELETE FROM asset WHERE assetid = ?";
    con.query(sql, [assetid], function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        if (results.affectedRows != 1) {
            console.error('Row deleted is not 1');
            return res.status(500).send("Delete failed");
        }
        res.status(200).send("Delete successfully");
    });
});

//Add 
app.post("/assetstaff", upload.single('file'), function (req, res) {
    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }

    // รับข้อมูลจาก form
    const assetname = req.body.aname;
    const assetimage = req.file.filename; // ใช้ชื่อไฟล์ที่ได้จาก multer
    const astatus = req.body.astatus;

    const sql = "INSERT INTO asset (assetname, assetimage, status) VALUES (?, ?, ?)";
    con.query(sql, [assetname, assetimage, astatus], function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }

        console.log(results);

        if (results.affectedRows !== 1) {
            console.error('Row added is not 1');
            return res.status(500).send("Add failed");
        }

        res.status(200).send("Add successfully");
    });
});

// Edit
app.put("/assetstaff/:id", upload.single('file'), function (req, res) {
    if (!req.file) {
        return res.status(400).send("No file uploaded");
    }
    const assetid = req.params.id;
    const assetname = req.body.aname;
    const assetimage = req.file.filename;
    const astatus = req.body.astatus;
    const sql = "UPDATE asset SET assetname = ?, assetimage = ?, status = ? WHERE assetid = ?";
    con.query(sql, [assetname, assetimage, astatus, assetid], function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        console.log(results);
        if (results.affectedRows !== 1) {
            console.error('Row updated is not 1');
            return res.status(500).send("Update failed");
        }
        res.status(200).send("Update successfully");
    });
});

// Return
app.put("/assetstaffReturn/:id", function (req, res) {
    const assetid = req.params.id;
    const updateProduct = req.body;
    const sql = "UPDATE asset SET ? WHERE assetid = ?";
    con.query(sql, [updateProduct, assetid], function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        if (results.affectedRows != 1) {
            console.error('Row updated is not 1');
            return res.status(500).send("Update failed");
        }
        res.status(200).send("Update successfully");
    });
});

// Show itemlist
app.get('/staff/itemlist', function (req, res) {
    if (req.session.role == 'staff') {
        res.sendFile(path.join(__dirname, 'views/UI/Staff/Mainstaff.html'))
    }
    else {
        res.redirect('/');
    }
});

app.get('/staff/yourlist', function (req, res) {
    if (req.session.role == 'staff') {
        res.sendFile(path.join(__dirname, 'views/UI/Staff/Liststaff.html'))
    }
    else {
        res.redirect('/');
    }
});

app.get('/staff/checkstatus', function (req, res) {
    if (req.session.role == 'staff') {
        res.sendFile(path.join(__dirname, 'views/UI/Staff/Staff-status.html'))
    }
    else {
        res.redirect('/');
    }
});

app.get('/staff/history', function (req, res) {
    if (req.session.role == 'staff') {
        res.sendFile(path.join(__dirname, 'views/UI/Staff/historyStaff.html'))
    }
    else {
        res.redirect('/');
    }
});

app.delete("/deletehistory", function (req, res) {
    const sql = "DELETE FROM borrowingrequest";
    con.query(sql, function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        if (results.affectedRows === 0) {
            console.error('No rows deleted');
            return res.status(404).send("No rows found for deletion");
        }
        res.status(200).send("Delete successfully");
    });
});


// ============ Lender =================
app.get('/lender', function (req, res) {
    if (req.session.role == 'lender') {
        res.sendFile(path.join(__dirname, 'views/UI/Aj/dashboardAj.html'))
    }
    else {
        res.redirect('/');
    }
});

app.get('/assetlender', function (req, res) {
    // if (req.session.role == 'lender') {
        const sql = "SELECT * FROM asset";
        con.query(sql, function (err, results) {
            if (err) {
                console.error(err);
                res.status(500).send('DB error');
            }
            else {
                res.status(200).json(results);
            }
        });
    }
//     else {
//         res.redirect('/');
//     }
// }
);

app.get('/lender/itemlist', function (req, res) {
    if (req.session.role == 'lender') {
        res.sendFile(path.join(__dirname, 'views/UI/Aj/MainAj.html'))
    }
    else {
        res.redirect('/');
    }
});

app.get('/lender/yourlist', function (req, res) {
    if (req.session.role == 'lender') {
        res.sendFile(path.join(__dirname, 'views/UI/Aj/ListAj.html'))
    }
    else {
        res.redirect('/');
    }
});

app.get('/lender/history', function (req, res) {
    if (req.session.role == 'lender') {
        res.sendFile(path.join(__dirname, 'views/UI/Aj/checkstatusAj.html'))
    }
    else {
        res.redirect('/');
    }
});

app.get('/getBorrowingData', (req, res) => {
    const query = `SELECT borrowerID, userborrowID, assetid, approverby, borrowingDate, returnDate, status, messageText FROM borrowingRequest`;
    con.query(query, (err, results) => {
        if (err) {
            console.error('Error executing SQL query:', err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            res.status(200).json(results);
        }
    });
});

app.put('/updateBorrowStatus/:id', async function (req, res) {
    const borrowId = req.params.id;
    const updateData = req.body;
    const newStatus = updateData.status;
    const approverBy = updateData.approverby;

    const sql = "UPDATE borrowingRequest SET status = ?, approverby = ? WHERE borrowerID = ?";
    con.query(sql, [newStatus, approverBy, borrowId], function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        if (results.affectedRows === 0) {
            console.error('No rows updated');
            return res.status(500).send("No rows updated");
        }
        res.status(200).send("Update successfully");
    });
});

app.get('/lender/history', function (req, res) {
    if (req.session.role == 'lender') {
        res.sendFile(path.join(__dirname, 'views/UI/Aj/checkstatusAj.html'))
    }
    else {
        res.redirect('/');
    }
});

app.put('/rejectBorrowRequest/:id', async function (req, res) {
    const borrowId = req.params.id;
    const { reason, approverby } = req.body;

    const sql = "UPDATE borrowingRequest SET status = 'reject', messageText = ?, approverby = ? WHERE borrowerID = ?";
    con.query(sql, [reason, approverby, borrowId], function (err, results) {
        if (err) {
            console.error(err);
            return res.status(500).send("Database server error");
        }
        if (results.affectedRows === 0) {
            console.error('No rows updated');
            return res.status(500).send("No rows updated");
        }
        res.status(200).send("Update successfully");
    });
});

app.get('/getUserNameById/:id', async function (req, res) {
    const userId = req.params.id;
    const sql = 'SELECT name FROM user WHERE userid = ?';
    con.query(sql, [userId], function (err, results) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            if (results.length > 0) {
                res.json({ name: results[0].name });
            } else {
                res.status(401).json({ name: 'Unknown' });
            }
        }
    });
});

app.get('/getAssetNameById/:id', async function (req, res) {
    const assetId = req.params.id;
    const sql = 'SELECT assetname FROM asset WHERE assetid = ?';
    con.query(sql, [assetId], function (err, results) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            if (results.length > 0) {
                res.json({ assetname: results[0].assetname });
            } else {
                res.status(401).json({ assetname: 'Unknown' });
            }
        }
    });
});

app.get('/getAssetStatusById/:id', async function (req, res) {
    const assetId = req.params.id;
    const sql = 'SELECT status FROM asset WHERE assetid = ?';
    con.query(sql, [assetId], function (err, results) {
        if (err) {
            console.error(err);
            res.status(500).json({ error: 'Internal Server Error' });
        } else {
            if (results.length > 0) {
                res.json({ status: results[0].status });
            } else {
                res.status(401).json({ status: 'Unknown' });
            }
        }
    });
});

app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});

app.get('/user', function (req, res) {
    res.json({
        "id": req.session.userID,
        "name": req.session.name,
        "username": req.session.username,
        "role": req.session.role
    });
});

app.get('/getAssetIdByBorrowId/:borrowId', function (req, res) {
    const borrowId = req.params.borrowId;
    const sql = 'SELECT assetid FROM borrowingrequest WHERE borrowerID = ?';

    con.query(sql, [borrowId], function (err, results) {
        if (err) {
            console.error(err);
            res.status(500).send('DB error');
        } else {
            if (results.length > 0) {
                res.json({ assetid: results[0].assetid });
            } else {
                res.status(401).json({ assetid: null });
            }
        }
    });
});

// ------------ root service ----------
app.get('/', function (req, res) {
    if (req.session.role == 'borrower') {
        res.redirect('/borrower/itemlist');
    }
    if (req.session.role == 'staff') {
        res.redirect('/staff');
    }
    if (req.session.role == 'lender') {
        res.redirect('/lender');
    }
    res.sendFile(path.join(__dirname, 'views/login-project.html'))
});

const port = 3005;
app.listen(port, function () {
    console.log('Server is runnint at port ' + port);
});
