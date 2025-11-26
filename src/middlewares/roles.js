export const isProvider = (req, res, next) => {
  if (req.user.role !== "provider")
    return res.status(403).json({ message: "Accès réservé aux prestataires" });

  next();
};

export const isClient = (req, res, next) => {
  if (req.user.role !== "client")
    return res.status(403).json({ message: "Accès réservé aux clients" });

  next();
};

export const isAdmin = (req, res, next) => {
  if (req.user.role !== "admin")
    return res.status(403).json({ message: "Accès réservé aux administrateurs" });

  next();
};
