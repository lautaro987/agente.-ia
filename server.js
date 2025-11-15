const express = require("express");
const path = require("path");

const app = express();

// Servir archivos estáticos desde la carpeta public
app.use(express.static("public"));

// Ruta principal → index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Puerto para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
