const path = require('path');
const { getDefaultConfig } = require('expo/metro-config'); // או מ-@react-native/metro-config תלוי בפרויקט

// מציאת הנתיב לתיקיית ה-Workspace הראשית
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. הוספת התיקייה הראשית (Workspace Root) לרשימת התיקיות ש-Metro עוקב אחריהן
config.watchFolders = [workspaceRoot];

// 2. הפניית Metro לחיפוש מודולים גם ב-node_modules הראשי וגם במקומי
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// במקרים מסוימים צריך למנוע כפילויות של React אם הוא מותקן גם למעלה,
// אך בשלב זה נשאיר זאת פשוט.

module.exports = config;