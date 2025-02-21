const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));
app.use('/photos', express.static('photos'));

// 📌 Rasmlar uchun papka yaratish
const uploadDir = 'photos/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 📌 Fayl yuklash sozlamalari
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Add helper function to prefix image filename with "photos/" if missing
function addPhotosPrefix(filename) {
    return filename.startsWith("photos/") ? filename : `photos/${filename}`;
}

// 📌 JSON faylni o‘qish
function readJSONFile(filename, callback) {
    fs.readFile(filename, 'utf8', (err, data) => {
        let result = [];
        if (!err && data.trim()) {
            try {
                result = JSON.parse(data);
                if (!Array.isArray(result)) result = [];
            } catch (error) {
                result = [];
            }
        }
        callback(result);
    });
}

// 📌 JSON faylga yozish
function writeJSONFile(filename, data, res, successMessage) {
    fs.writeFile(filename, JSON.stringify(data, null, 2), (err) => {
        if (err) return res.status(500).json({ message: 'Xatolik yuz berdi!' });
        res.json({ message: successMessage });
    });
}

// 📌 **Barcha mahsulotlarni olish**
app.get('/api/products', (req, res) => {
    readJSONFile(path.join(__dirname, 'products.json'), products => res.json(products));
});

// 📌 **Mahsulot qo‘shish**
app.post('/api/products', upload.single('image'), (req, res) => {
    const { name, description } = req.body;
    const image = req.file;

    if (!name || !description || !image) {
        return res.status(400).json({ message: 'Barcha maydonlarni to‘ldiring!' });
    }

    const newProduct = {
        name,
        description,
        image: addPhotosPrefix(image.filename)
    };

    const productsFilePath = path.join(__dirname, 'products.json');
    fs.readFile(productsFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Xatolik: faylni o‘qib bo‘lmadi' });
        }

        let products = [];
        if (data) {
            products = JSON.parse(data);
        }

        products.push(newProduct);

        fs.writeFile(productsFilePath, JSON.stringify(products, null, 2), (err) => {
            if (err) {
                return res.status(500).json({ message: 'Xatolik: faylni yozib bo‘lmadi' });
            }

            res.json({ message: 'Mahsulot muvaffaqiyatli qo‘shildi!' });
        });
    });
});

// 📌 **Savatdagi mahsulotlarni olish**
app.get('/api/basket', (req, res) => {
    readJSONFile(path.join(__dirname, 'basket.json'), basket => res.json(basket));
});

// 📌 **Savatdan mahsulot o‘chirish**
app.delete('/api/basket/:id', (req, res) => {
    const productId = req.params.id;

    readJSONFile(path.join(__dirname, 'basket.json'), basket => {
        const updatedBasket = basket.filter(product => product.id !== productId);
        writeJSONFile(path.join(__dirname, 'basket.json'), updatedBasket, res, 'Mahsulot savatdan o‘chirildi!');
    });
});

// 📌 **Ro‘yxatdan o‘tish (register)**
app.post('/api/register', (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        return res.status(400).json({ message: 'Barcha maydonlarni to‘ldiring!' });
    }

    readJSONFile(path.join(__dirname, 'users.json'), users => {
        if (users.some(user => user.username === username)) {
            return res.status(400).json({ message: 'Bu foydalanuvchi allaqachon mavjud!' });
        }

        users.push({ username, email, password });
        writeJSONFile(path.join(__dirname, 'users.json'), users, res, 'Muvaffaqiyatli ro‘yxatdan o‘tdingiz!');
    });
});

// 📌 **Login qilish**
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;

    readJSONFile(path.join(__dirname, 'users.json'), users => {
        const user = users.find(u => u.username === username && u.password === password);
        if (!user) {
            return res.status(400).json({ message: 'Login yoki parol noto‘g‘ri!' });
        }
        res.json({ message: 'Muvaffaqiyatli kirdingiz!', success: true });
    });
});

// 📌 **Serverni ishga tushirish**
app.listen(PORT, () => {
    console.log(`✅ Server http://localhost:${PORT} da ishlamoqda`);
});
