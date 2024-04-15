const pg = require('pg');
const connectionString = process.env.DATABASE_URL;
console.log('connection string', connectionString)
const pool = new pg.Pool({connectionString: connectionString});

async function createUpload(mimetype, size, filename) {
    const result = await pool.query('INSERT INTO uploads (mimetype, size, filename) VALUES ($1, $2, $3) RETURNING id', [mimetype, size, filename]);
    return result.rows[0];
}

async function getUploads() {
    const result = await pool.query('SELECT * FROM uploads');
    return result.rows;
}

async function getUpload(id) {
    const result = await pool.query('SELECT * FROM uploads WHERE id = $1', [id]);
    return result.rows[0];
}

async function deleteUpload(id) {
    await pool.query('DELETE FROM uploads WHERE id = $1', [id]);
}

async function createTable() {
    await pool.query(`CREATE TABLE IF NOT EXISTS uploads (
                id SERIAL PRIMARY KEY, 
                mimetype VARCHAR(255), 
                size INTEGER, 
                filename VARCHAR(255))`);
}

module.exports = {
    createUpload,
    getUploads,
    getUpload,
    deleteUpload,
};

setTimeout(() => {
    console.log('creating table if not exists...');
    createTable()
        .then(() => console.log('table created if not exists'))
        .catch(err => {
            console.log(err);
            console.log('database not available, exiting');
            process.exit(1);
        });
}, 5000);