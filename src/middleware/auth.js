import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token kerak' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Token yaroqsiz yoki muddati o\'tgan' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin')
    return res.status(403).json({ error: 'Faqat admin uchun' });
  next();
}

export function requireDepartmentAccess(req, res, next) {
  const { departmentId } = req.params;
  if (req.user.role === 'admin') return next();
  if (String(req.user.department_id) !== String(departmentId))
    return res.status(403).json({ error: 'Bu bo\'lim sizga tegishli emas' });
  next();
}
