import Notification from '../models/Notification.js';
import User from '../models/User.js';

export const notifyUser = async (
  userId: string,
  type: string,
  message: string,
  link = ''
): Promise<void> => {
  try {
    await Notification.create({ recipient: userId, role: 'user', type, message, link });
  } catch (e) { console.error('[notify] user error:', e); }
};

export const notifyAdmins = async (
  type: string,
  message: string,
  link = ''
): Promise<void> => {
  try {
    const admins = await User.find({ role: 'administrator' }, '_id');
    if (admins.length === 0) return;
    await Notification.insertMany(
      admins.map(a => ({ recipient: a._id, role: 'admin', type, message, link }))
    );
  } catch (e) { console.error('[notify] admin error:', e); }
};
