import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import PropTypes from 'prop-types';
import { socket } from '../services/socket.service';
import { updateBalances } from '../store/slices/walletSlice';
import { authService } from '../services/auth.service';

const BASE_URL = 'http://10.0.2.2:8080/api';

const getAuthHeaders = async () => {
  const token = await authService.getToken();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
};

// ─── UI primitives ────────────────────────────────────────────
const Badge = ({ label, color = '#ffa502' }) => (
  <View
    style={[badge.wrap, { backgroundColor: color + '22', borderColor: color }]}
  >
    <Text style={[badge.text, { color }]}>{label}</Text>
  </View>
);
Badge.propTypes = {
  label: PropTypes.string.isRequired,
  color: PropTypes.string,
};
Badge.defaultProps = { color: '#ffa502' };
const badge = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});

const Card = ({ children, style }) => (
  <View style={[card.wrap, style]}>{children}</View>
);
Card.propTypes = {
  children: PropTypes.node.isRequired,
  style: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
};
Card.defaultProps = { style: null };
const card = StyleSheet.create({
  wrap: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
});

const Field = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
}) => (
  <View style={{ marginBottom: 12 }}>
    <Text style={field.label}>{label}</Text>
    <TextInput
      style={field.input}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#4b5563"
      keyboardType={keyboardType}
      autoCapitalize="none"
    />
  </View>
);
Field.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChangeText: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  keyboardType: PropTypes.string,
};
Field.defaultProps = { placeholder: '', keyboardType: 'default' };
const field = StyleSheet.create({
  label: {
    color: '#9ca3af',
    fontSize: 12,
    marginBottom: 5,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 12,
    color: '#f9fafb',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
});

const Btn = ({ label, onPress, color = '#ffa502', disabled, loading }) => (
  <TouchableOpacity
    style={[
      btn.wrap,
      { backgroundColor: disabled || loading ? '#374151' : color },
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color="#000" size="small" />
    ) : (
      <Text style={[btn.text, { color: disabled ? '#6b7280' : '#000' }]}>
        {label}
      </Text>
    )}
  </TouchableOpacity>
);
Btn.propTypes = {
  label: PropTypes.string.isRequired,
  onPress: PropTypes.func.isRequired,
  color: PropTypes.string,
  disabled: PropTypes.bool,
  loading: PropTypes.bool,
};
Btn.defaultProps = { color: '#ffa502', disabled: false, loading: false };
const btn = StyleSheet.create({
  wrap: { borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 4 },
  text: { fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
});

const NoQuestion = () => (
  <Card>
    <Text
      style={{ color: '#9ca3af', textAlign: 'center', paddingVertical: 20 }}
    >
      אין שאלה פעילה.{'\n'}צור שאלה קודם מהטאב ➕
    </Text>
  </Card>
);

// ─── WINNER_TAKES_ALL form ────────────────────────────────────
const WinnerForm = ({ gameId, onCreated }) => {
  const [questionText, setQuestionText] = useState('');
  const [player1Name, setPlayer1Name] = useState('');
  const [player1Id, setPlayer1Id] = useState('');
  const [player2Name, setPlayer2Name] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!questionText.trim()) return Alert.alert('שגיאה', 'חסר טקסט שאלה');
    if (!player1Name.trim() || !player2Name.trim())
      return Alert.alert('שגיאה', 'חסרים שמות שחקנים');
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const body = {
        gameId,
        questionText,
        rewardType: 'WINNER_TAKES_ALL',
        options: [
          {
            text: player1Name,
            isCorrect: false,
            ...(player1Id.trim() ? { linkedPlayerId: player1Id.trim() } : {}),
          },
          { text: player2Name, isCorrect: false },
        ],
      };
      const res = await fetch(`${BASE_URL}/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
      if (res.ok) {
        const q = data.question || data;
        Alert.alert('✅ שאלה נוצרה!', `ID: ${q.id || '—'}`);
        onCreated(q);
      } else {
        Alert.alert('שגיאה ' + res.status, data.error || data.message || text);
      }
    } catch (e) {
      console.error('Create winner question error:', e);
      Alert.alert('שגיאה', 'בעיית תקשורת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Badge label="🏆 מי ינצח?" color="#60a5fa" />
      <View style={{ height: 14 }} />
      <Field
        label="טקסט השאלה"
        value={questionText}
        onChangeText={setQuestionText}
        placeholder="מי ינצח בסיבוב הזה?"
      />
      <Field
        label="שחקן א׳ – שם"
        value={player1Name}
        onChangeText={setPlayer1Name}
        placeholder="שם שחקן א'"
      />
      <Field
        label="שחקן א׳ – Player ID (אופציונלי)"
        value={player1Id}
        onChangeText={setPlayer1Id}
        placeholder="uuid..."
      />
      <Field
        label="שחקן ב׳ – שם"
        value={player2Name}
        onChangeText={setPlayer2Name}
        placeholder="שם שחקן ב'"
      />
      <Btn
        label="צור שאלה"
        onPress={handleCreate}
        color="#60a5fa"
        loading={loading}
      />
    </>
  );
};
WinnerForm.propTypes = {
  gameId: PropTypes.string.isRequired,
  onCreated: PropTypes.func.isRequired,
};

// ─── STANDARD form (אמריקאית) ─────────────────────────────────
const OPTION_LABELS = ['א', 'ב', 'ג', 'ד'];

const StandardForm = ({ gameId, onCreated }) => {
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState([
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);
  const [loading, setLoading] = useState(false);

  const updateText = (index, value) => {
    const updated = [...options];
    updated[index] = { ...updated[index], text: value };
    setOptions(updated);
  };

  const setCorrect = (index) => {
    // רק אחת יכולה להיות נכונה
    setOptions(options.map((opt, i) => ({ ...opt, isCorrect: i === index })));
  };

  const addOption = () => {
    if (options.length < 4)
      setOptions([...options, { text: '', isCorrect: false }]);
  };

  const removeOption = (index) => {
    if (options.length <= 2) return;
    const updated = options.filter((_, i) => i !== index);
    // אם הסרנו את הנכונה, נאפס
    const hasCorrect = updated.some((o) => o.isCorrect);
    if (!hasCorrect) updated[0] = { ...updated[0], isCorrect: true };
    setOptions(updated);
  };

  const handleCreate = async () => {
    if (!questionText.trim()) return Alert.alert('שגיאה', 'חסר טקסט שאלה');
    const filled = options.filter((o) => o.text.trim());
    if (filled.length < 2) return Alert.alert('שגיאה', 'חובה לפחות 2 אפשרויות');
    if (!filled.some((o) => o.isCorrect))
      return Alert.alert('שגיאה', 'סמן תשובה נכונה אחת');
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const body = {
        gameId,
        questionText,
        rewardType: 'STANDARD',
        options: filled.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
      };
      const res = await fetch(`${BASE_URL}/questions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: text };
      }
      if (res.ok) {
        const q = data.question || data;
        Alert.alert('✅ שאלה נוצרה!', `ID: ${q.id || '—'}`);
        onCreated(q);
      } else {
        Alert.alert('שגיאה ' + res.status, data.error || data.message || text);
      }
    } catch (e) {
      console.error('Create standard question error:', e);
      Alert.alert('שגיאה', 'בעיית תקשורת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Badge label="📝 שאלה אמריקאית" color="#a78bfa" />
      <View style={{ height: 14 }} />
      <Field
        label="טקסט השאלה"
        value={questionText}
        onChangeText={setQuestionText}
        placeholder="כתוב את השאלה כאן..."
      />
      <Text style={stdStyles.optionsTitle}>
        אפשרויות — לחץ על ✓ לסימון התשובה הנכונה
      </Text>
      {options.map((opt, i) => (
        <View key={i} style={stdStyles.optBlock}>
          <View style={stdStyles.optRow}>
            <View style={stdStyles.optLetter}>
              <Text style={stdStyles.optLetterText}>{OPTION_LABELS[i]}</Text>
            </View>
            <TextInput
              style={[
                stdStyles.optInput,
                opt.isCorrect && stdStyles.optInputCorrect,
              ]}
              value={opt.text}
              onChangeText={(v) => updateText(i, v)}
              placeholder={`אפשרות ${OPTION_LABELS[i]}...`}
              placeholderTextColor="#4b5563"
              autoCapitalize="none"
            />
          </View>
          <View style={stdStyles.optActions}>
            <TouchableOpacity
              style={[
                stdStyles.correctBtn,
                opt.isCorrect && stdStyles.correctBtnActive,
              ]}
              onPress={() => setCorrect(i)}
            >
              <Text
                style={[
                  stdStyles.correctBtnText,
                  opt.isCorrect && stdStyles.correctBtnTextActive,
                ]}
              >
                {opt.isCorrect ? '✓ תשובה נכונה' : '◯ סמן כנכונה'}
              </Text>
            </TouchableOpacity>
            {options.length > 2 && (
              <TouchableOpacity
                style={stdStyles.removeBtn}
                onPress={() => removeOption(i)}
              >
                <Text style={stdStyles.removeBtnText}>✕ הסר</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
      {options.length < 4 && (
        <TouchableOpacity style={stdStyles.addBtn} onPress={addOption}>
          <Text style={stdStyles.addBtnText}>
            ＋ הוסף אפשרות ({options.length}/4)
          </Text>
        </TouchableOpacity>
      )}
      <Btn
        label="צור שאלה"
        onPress={handleCreate}
        color="#a78bfa"
        loading={loading}
      />
    </>
  );
};
StandardForm.propTypes = {
  gameId: PropTypes.string.isRequired,
  onCreated: PropTypes.func.isRequired,
};

const stdStyles = StyleSheet.create({
  optionsTitle: {
    color: '#6b7280',
    fontSize: 11,
    marginBottom: 10,
    textAlign: 'right',
  },
  optBlock: {
    backgroundColor: '#1a2235',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 10,
    overflow: 'hidden',
  },
  optRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10 },
  optLetter: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optLetterText: { color: '#9ca3af', fontWeight: '800', fontSize: 13 },
  optInput: {
    flex: 1,
    backgroundColor: 'transparent',
    color: '#f9fafb',
    fontSize: 14,
    paddingVertical: 4,
  },
  optInputCorrect: { color: '#a78bfa' },
  optActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  correctBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  correctBtnActive: { backgroundColor: '#a78bfa22', borderColor: '#a78bfa' },
  correctBtnText: { color: '#6b7280', fontWeight: '700', fontSize: 12 },
  correctBtnTextActive: { color: '#a78bfa' },
  removeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f8717122',
    borderWidth: 1,
    borderColor: '#f87171',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeBtnText: { color: '#f87171', fontSize: 12, fontWeight: '700' },
  addBtn: {
    borderWidth: 1,
    borderColor: '#374151',
    borderRadius: 10,
    borderStyle: 'dashed',
    padding: 11,
    alignItems: 'center',
    marginBottom: 12,
  },
  addBtnText: { color: '#6b7280', fontWeight: '600', fontSize: 13 },
});

// ─── Load existing question ────────────────────────────────────
const LoadForm = ({ gameId, onCreated }) => {
  const [openQuestions, setOpenQuestions] = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [selectedQ, setSelectedQ] = useState(null);

  const fetchOpenQuestions = async () => {
    if (!gameId) return Alert.alert('שגיאה', 'הכנס Game ID קודם');
    setLoadingList(true);
    setOpenQuestions([]);
    setSelectedQ(null);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}/questions/game/${gameId}`, {
        headers,
      });
      const text = await res.text();
      if (text.startsWith('<')) {
        Alert.alert('שגיאה', 'תגובה לא תקינה מהשרת');
        return;
      }
      const data = JSON.parse(text);
      const questions = Array.isArray(data) ? data : data.questions || [];
      const open = questions.filter((q) => !q.isResolved);
      if (open.length === 0)
        Alert.alert('אין שאלות', 'לא נמצאו שאלות פתוחות במשחק זה');
      setOpenQuestions(open);
    } catch (e) {
      console.error('Fetch open questions error:', e);
      Alert.alert('שגיאה', 'בעיית תקשורת');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchOpenQuestions();
  }, []);

  const handleSelect = (q) => {
    setSelectedQ(q);
    onCreated(q);
    Alert.alert('✅ שאלה נטענה', q.questionText || q.text || q.id);
  };

  return (
    <>
      <Badge label="📋 שאלות פתוחות" color="#fbbf24" />
      <View style={{ height: 12 }} />
      {loadingList && (
        <ActivityIndicator color="#fbbf24" style={{ marginVertical: 20 }} />
      )}
      {!loadingList && openQuestions.length === 0 && (
        <Text
          style={{ color: '#6b7280', textAlign: 'center', paddingVertical: 16 }}
        >
          אין שאלות פתוחות
        </Text>
      )}
      {openQuestions.map((q) => (
        <TouchableOpacity
          key={q.id}
          style={[
            loadStyles.item,
            selectedQ?.id === q.id && loadStyles.itemSelected,
          ]}
          onPress={() => handleSelect(q)}
        >
          <View style={loadStyles.itemHeader}>
            <Text style={loadStyles.itemText} numberOfLines={2}>
              {q.questionText || q.text || '—'}
            </Text>
            <View
              style={[
                loadStyles.typeBadge,
                {
                  backgroundColor:
                    q.rewardType === 'WINNER_TAKES_ALL'
                      ? '#60a5fa22'
                      : '#a78bfa22',
                  borderColor:
                    q.rewardType === 'WINNER_TAKES_ALL' ? '#60a5fa' : '#a78bfa',
                },
              ]}
            >
              <Text
                style={{
                  color:
                    q.rewardType === 'WINNER_TAKES_ALL' ? '#60a5fa' : '#a78bfa',
                  fontSize: 12,
                  fontWeight: '700',
                }}
              >
                {q.rewardType === 'WINNER_TAKES_ALL' ? '🏆' : '📝'}
              </Text>
            </View>
          </View>
          <Text style={loadStyles.itemId}>{q.id?.slice(0, 8)}…</Text>
        </TouchableOpacity>
      ))}
      {!loadingList && (
        <Btn
          label="🔄 רענן רשימה"
          onPress={fetchOpenQuestions}
          color="#374151"
        />
      )}
    </>
  );
};
LoadForm.propTypes = {
  gameId: PropTypes.string.isRequired,
  onCreated: PropTypes.func.isRequired,
};

const loadStyles = StyleSheet.create({
  item: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    padding: 13,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#374151',
  },
  itemSelected: { borderColor: '#fbbf24', backgroundColor: '#fbbf2411' },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  itemText: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginRight: 8,
  },
  itemId: { color: '#6b7280', fontSize: 11 },
  typeBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
});

// ─── CreateQuestionSection (wrapper) ─────────────────────────
const MODES = [
  { id: 'winner', label: '🏆 מי ינצח' },
  { id: 'standard', label: '📝 שאלה' },
  { id: 'load', label: '📋 טען' },
];

const CreateQuestionSection = ({ gameId, onCreated }) => {
  const [mode, setMode] = useState('winner');
  return (
    <Card>
      <View style={modeStyles.row}>
        {MODES.map((m) => (
          <TouchableOpacity
            key={m.id}
            style={[modeStyles.btn, mode === m.id && modeStyles.btnActive]}
            onPress={() => setMode(m.id)}
          >
            <Text
              style={[
                modeStyles.btnText,
                mode === m.id && modeStyles.btnTextActive,
              ]}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={{ height: 16 }} />
      {mode === 'winner' && (
        <WinnerForm gameId={gameId} onCreated={onCreated} />
      )}
      {mode === 'standard' && (
        <StandardForm gameId={gameId} onCreated={onCreated} />
      )}
      {mode === 'load' && <LoadForm gameId={gameId} onCreated={onCreated} />}
    </Card>
  );
};
CreateQuestionSection.propTypes = {
  gameId: PropTypes.string.isRequired,
  onCreated: PropTypes.func.isRequired,
};
const modeStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  btn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  btnActive: { backgroundColor: '#ffa50222', borderColor: '#ffa502' },
  btnText: { color: '#6b7280', fontWeight: '700', fontSize: 12 },
  btnTextActive: { color: '#ffa502' },
});

// ─── ResolveQuestionSection ───────────────────────────────────
// WINNER_TAKES_ALL → בוחרים מי ניצח
// STANDARD         → כפתור אחד "סגור שאלה" (התשובה הנכונה ידועה מהיצירה)
const ResolveQuestionSection = ({ question }) => {
  const [loading, setLoading] = useState(false);
  if (!question) return null;

  const isWinner = question.rewardType === 'WINNER_TAKES_ALL';
  const options = question.options || [];
  const correctOpt = options.find((o) => o.isCorrect);

  const handleResolve = async (optionId) => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}/questions/${question.id}/resolve`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ optionId }),
      });
      const data = await res.json();
      if (res.ok) Alert.alert('✅ שאלה נסגרה!', 'הקופה חולקה והיתרות עודכנו');
      else Alert.alert('שגיאה', data.error || 'אין הרשאה');
    } catch {
      Alert.alert('שגיאה', 'תקלה בחיבור לשרת');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Badge label="⚡ סגירת שאלה" color="#f87171" />
      <Text style={resolve.questionText}>
        {question.questionText || question.text}
      </Text>

      {isWinner ? (
        // WINNER_TAKES_ALL — בחירת מי ניצח
        <>
          <Text style={resolve.subTitle}>בחר את הזוכה:</Text>
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.id}
              style={[resolve.optBtn, loading && { opacity: 0.6 }]}
              onPress={() => handleResolve(opt.id)}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={resolve.optLabel}>🏆 {opt.text || opt.label}</Text>
              )}
            </TouchableOpacity>
          ))}
        </>
      ) : (
        // STANDARD — סגירה עם התשובה הנכונה שכבר ידועה
        <>
          {correctOpt && (
            <View style={resolve.correctBox}>
              <Text style={resolve.correctLabel}>✓ תשובה נכונה:</Text>
              <Text style={resolve.correctText}>{correctOpt.text}</Text>
            </View>
          )}
          <Btn
            label="סגור שאלה וחלק פרסים"
            onPress={() => correctOpt && handleResolve(correctOpt.id)}
            color="#f87171"
            loading={loading}
            disabled={!correctOpt}
          />
        </>
      )}
    </Card>
  );
};
ResolveQuestionSection.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string,
    rewardType: PropTypes.string,
    questionText: PropTypes.string,
    text: PropTypes.string,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        text: PropTypes.string,
        label: PropTypes.string,
        isCorrect: PropTypes.bool,
      })
    ),
  }),
};
ResolveQuestionSection.defaultProps = { question: null };
const resolve = StyleSheet.create({
  questionText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 12,
    textAlign: 'right',
  },
  subTitle: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
  },
  optBtn: {
    backgroundColor: '#fbbf24',
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  optLabel: { color: '#000', fontWeight: '800', fontSize: 14 },
  correctBox: {
    backgroundColor: '#a78bfa22',
    borderWidth: 1,
    borderColor: '#a78bfa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  correctLabel: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  correctText: {
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'right',
  },
});

// ─── BettingSection ───────────────────────────────────────────
const BettingSection = ({ question }) => {
  const [wager, setWager] = useState('10');
  const [loadingOption, setLoadingOption] = useState(null);
  if (!question) return null;
  const options = question.options || [];

  const handleBet = async (optionId, optionLabel) => {
    if (!wager || Number(wager) <= 0)
      return Alert.alert('שגיאה', 'סכום הימור לא תקין');
    setLoadingOption(optionId);
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}/user-answers/submit`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          questionId: question.id,
          selectedOptionId: optionId,
          wager: Number(wager),
        }),
      });
      const data = await res.json();
      if (res.ok)
        Alert.alert('✅ הימור נשלח!', `הימרת ${wager} על: ${optionLabel}`);
      else Alert.alert('שגיאה', data.error || 'ההימור נכשל');
    } catch {
      Alert.alert('שגיאה', 'בעיית תקשורת');
    } finally {
      setLoadingOption(null);
    }
  };

  return (
    <Card>
      <Badge label="🎲 הימורים" color="#a78bfa" />
      <Text style={bet.questionText}>
        {question.questionText || question.text}
      </Text>
      <Field
        label="סכום הימור"
        value={wager}
        onChangeText={setWager}
        placeholder="10"
        keyboardType="numeric"
      />
      <View style={{ gap: 10, marginTop: 4 }}>
        {options.map((opt, i) => (
          <TouchableOpacity
            key={opt.id}
            style={[bet.optBtn, loadingOption === opt.id && { opacity: 0.6 }]}
            onPress={() => handleBet(opt.id, opt.text || opt.label)}
            disabled={!!loadingOption}
          >
            {loadingOption === opt.id ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Text style={bet.optLabel}>
                {OPTION_LABELS[i] ? `${OPTION_LABELS[i]}. ` : ''}
                {opt.text || opt.label}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </Card>
  );
};
BettingSection.propTypes = {
  question: PropTypes.shape({
    id: PropTypes.string,
    questionText: PropTypes.string,
    text: PropTypes.string,
    options: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.string,
        text: PropTypes.string,
        label: PropTypes.string,
      })
    ),
  }),
};
BettingSection.defaultProps = { question: null };
const bet = StyleSheet.create({
  questionText: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 12,
    textAlign: 'right',
  },
  optBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    padding: 13,
    alignItems: 'center',
  },
  optLabel: { color: '#fff', fontWeight: '800', fontSize: 14 },
});

// ─── SendGiftSection ──────────────────────────────────────────
const SendGiftSection = ({ gameId }) => {
  const [senderId, setSenderId] = useState('');
  const [receiverPlayerId, setReceiverPlayerId] = useState('');
  const [moderatorId, setModeratorId] = useState('');
  const [giftValue, setGiftValue] = useState('');
  const [giftGameId, setGiftGameId] = useState(gameId || '');
  const [loading, setLoading] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);

  useEffect(() => {
    if (gameId) setGiftGameId(gameId);
  }, [gameId]);

  const handleSend = async () => {
    if (
      !senderId ||
      !receiverPlayerId ||
      !moderatorId ||
      !giftValue ||
      !giftGameId
    )
      return Alert.alert('שגיאה', 'יש למלא את כל השדות');
    setLoading(true);
    setLastResponse(null);
    try {
      const headers = await getAuthHeaders();
      const body = {
        senderId,
        receiverPlayerId,
        moderatorId,
        giftValue: Number(giftValue),
        gameId: giftGameId,
      };
      const res = await fetch(`${BASE_URL}/economy/gifts/send`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = { raw: text };
      }
      setLastResponse({ ok: res.ok, status: res.status, data });
      if (res.ok)
        Alert.alert('🎁 מתנה נשלחה!', `${giftValue} מטבעות נשלחו בהצלחה`);
      else
        Alert.alert('שגיאה ' + res.status, data.error || data.message || text);
    } catch (e) {
      Alert.alert('שגיאה', 'בעיית תקשורת: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <Badge label="🎁 שליחת מתנה" color="#34d399" />
      <View style={{ height: 14 }} />
      <Field
        label="Sender ID"
        value={senderId}
        onChangeText={setSenderId}
        placeholder="uuid..."
      />
      <Field
        label="Receiver Player ID"
        value={receiverPlayerId}
        onChangeText={setReceiverPlayerId}
        placeholder="uuid..."
      />
      <Field
        label="Moderator ID"
        value={moderatorId}
        onChangeText={setModeratorId}
        placeholder="uuid..."
      />
      <Field
        label="Game ID"
        value={giftGameId}
        onChangeText={setGiftGameId}
        placeholder="uuid..."
      />
      <Field
        label="ערך המתנה"
        value={giftValue}
        onChangeText={setGiftValue}
        placeholder="100"
        keyboardType="numeric"
      />
      <Btn
        label="שלח מתנה"
        onPress={handleSend}
        color="#34d399"
        loading={loading}
      />
      {lastResponse && (
        <View
          style={{
            marginTop: 12,
            padding: 10,
            backgroundColor: lastResponse.ok ? '#052e16' : '#450a0a',
            borderRadius: 8,
          }}
        >
          <Text
            style={{
              color: lastResponse.ok ? '#34d399' : '#f87171',
              fontSize: 12,
              fontWeight: '700',
            }}
          >
            {lastResponse.ok ? '✅ הצלחה' : '❌ שגיאה'} — Status:{' '}
            {lastResponse.status}
          </Text>
          <Text style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>
            {JSON.stringify(lastResponse.data).slice(0, 200)}
          </Text>
        </View>
      )}
    </Card>
  );
};
SendGiftSection.propTypes = { gameId: PropTypes.string.isRequired };

// ─── Main GameScreen ──────────────────────────────────────────
const GameScreen = ({ gameId: gameIdProp }) => {
  const dispatch = useDispatch();
  const walletBalance = useSelector((state) => state.wallet.walletBalance || 0);
  const isModerator = true;

  const [resolvedGameId, setResolvedGameId] = useState(gameIdProp || '');
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [activeTab, setActiveTab] = useState('question');

  const score = useSelector(
    (state) => state.wallet.scoresByGame?.[resolvedGameId] || 0
  );

  const fetchOpenQuestion = async (gId) => {
    if (!gId) return;
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${BASE_URL}/questions/game/${gId}`, { headers });
      const text = await res.text();
      if (text.startsWith('<')) return;
      const data = JSON.parse(text);
      const questions = Array.isArray(data) ? data : data.questions || [];
      const open = questions.find((q) => !q.isResolved);
      if (open) {
        console.log('✅ Open question:', open.id);
        setActiveQuestion(open);
      }
    } catch (e) {
      console.error('Fetch question error:', e);
    }
  };

  useEffect(() => {
    if (resolvedGameId) fetchOpenQuestion(resolvedGameId);
  }, [resolvedGameId]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch(`${BASE_URL}/users/profile`, { headers });
        const data = await res.json();
        dispatch(
          updateBalances({
            walletCoins: data.walletCoins || data.walletBalance,
            scoresByGame: data.scoresByGame || {},
          })
        );
      } catch (e) {
        console.error('Fetch stats error:', e);
      }
    };
    fetchStats();
    const onUpdate = (data) => {
      console.log('🚀 [Socket]:', data);
      dispatch(updateBalances(data));
    };
    socket.on('balance_update', onUpdate);
    return () => socket.off('balance_update', onUpdate);
  }, [resolvedGameId, dispatch]);

  const tabs = [
    { id: 'question', label: '➕ שאלה' },
    { id: 'bet', label: '🎲 הימור' },
    ...(isModerator ? [{ id: 'resolve', label: '⚡ סגירה' }] : []),
    { id: 'gift', label: '🎁 מתנה' },
  ];

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>פאנל ניהול</Text>
        <View style={styles.statsRow}>
          <View style={styles.statChip}>
            <Text style={styles.statChipLabel}>ארנק</Text>
            <Text style={[styles.statChipVal, { color: '#ffa502' }]}>
              {Number(walletBalance).toFixed(0)}
            </Text>
          </View>
          <View style={styles.statChip}>
            <Text style={styles.statChipLabel}>ניקוד</Text>
            <Text style={[styles.statChipVal, { color: '#34d399' }]}>
              {Number(score).toFixed(0)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.gameIdRow}>
        <Text style={styles.gameIdLabel}>Game ID</Text>
        <TextInput
          style={styles.gameIdInput}
          value={resolvedGameId}
          onChangeText={setResolvedGameId}
          placeholder="הכנס Game ID..."
          placeholderTextColor="#4b5563"
          autoCapitalize="none"
          onEndEditing={() => fetchOpenQuestion(resolvedGameId)}
        />
      </View>

      <View style={styles.tabBar}>
        {tabs.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tab, activeTab === t.id && styles.tabActive]}
            onPress={() => setActiveTab(t.id)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === t.id && styles.tabTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      >
        {activeTab === 'question' && (
          <CreateQuestionSection
            gameId={resolvedGameId}
            onCreated={(q) => {
              setActiveQuestion(q);
              if (isModerator) setActiveTab('resolve');
            }}
          />
        )}
        {activeTab === 'bet' &&
          (activeQuestion ? (
            <BettingSection question={activeQuestion} />
          ) : (
            <NoQuestion />
          ))}
        {activeTab === 'resolve' &&
          isModerator &&
          (activeQuestion ? (
            <ResolveQuestionSection question={activeQuestion} />
          ) : (
            <NoQuestion />
          ))}
        {activeTab === 'gift' && <SendGiftSection gameId={resolvedGameId} />}
      </ScrollView>
    </View>
  );
};

GameScreen.propTypes = { gameId: PropTypes.string };
GameScreen.defaultProps = { gameId: null };

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#030712' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 12,
    backgroundColor: '#030712',
    borderBottomWidth: 1,
    borderColor: '#111827',
  },
  headerTitle: { color: '#f9fafb', fontSize: 20, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statChip: {
    backgroundColor: '#111827',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  statChipLabel: { color: '#6b7280', fontSize: 10, marginBottom: 2 },
  statChipVal: { fontWeight: '800', fontSize: 16 },
  gameIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0a0f1a',
    borderBottomWidth: 1,
    borderColor: '#111827',
  },
  gameIdLabel: {
    color: '#9ca3af',
    fontSize: 12,
    fontWeight: '700',
    minWidth: 58,
  },
  gameIdInput: {
    flex: 1,
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#ffa502',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#374151',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#0a0f1a',
    borderBottomWidth: 1,
    borderColor: '#111827',
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: '#ffa502' },
  tabText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#ffa502' },
  scroll: { flex: 1 },
});

export default GameScreen;
