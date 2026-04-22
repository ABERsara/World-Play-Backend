import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import { fetchHistory, togglePin } from '../store/slices/historySlice';

const TABS = [
  { id: 'all', label: 'הכל' },
  { id: 'asHost', label: '🎮 פתחתי' },
  { id: 'asPlayer', label: '👤 השתתפתי' },
];

const GameCard = ({ item, onPin }) => {
  const roleColor = item.relationType === 'HOST' ? '#ffa502' : '#60a5fa';
  const roleLabel = item.relationType === 'HOST' ? '🎮 מארח' : '👤 שחקן';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View
          style={[
            styles.badge,
            { borderColor: roleColor, backgroundColor: roleColor + '22' },
          ]}
        >
          <Text style={[styles.badgeText, { color: roleColor }]}>
            {roleLabel}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onPin(item.gameId)}>
          <Text style={styles.pinBtn}>
            {item.isPinned ? '📌 נעוץ' : '📍 נעץ'}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.gameTitle}>{item.game?.title || '—'}</Text>
      <Text style={styles.gameDate}>
        {new Date(item.createdAt).toLocaleDateString('he-IL')}
      </Text>

      <View style={styles.breakdown}>
        <Text style={styles.breakdownTitle}>ניקוד:</Text>
        <View style={styles.breakdownRow}>
          <Text
            style={styles.breakdownItem}
          >{`❓ שאלות: ${item.breakdown?.TRIVIA || 0}`}</Text>
          <Text
            style={styles.breakdownItem}
          >{`🎁 מתנות: ${item.breakdown?.DONATION || 0}`}</Text>
          <Text
            style={styles.breakdownItem}
          >{`⭐ בונוס: ${item.breakdown?.BONUS || 0}`}</Text>
        </View>
        <Text style={styles.totalText}>{`סהכ: ${item.total || 0}`}</Text>
      </View>
    </View>
  );
};

GameCard.propTypes = {
  item: PropTypes.shape({
    gameId: PropTypes.string,
    relationType: PropTypes.string,
    isPinned: PropTypes.bool,
    createdAt: PropTypes.string,
    total: PropTypes.number,
    game: PropTypes.shape({
      title: PropTypes.string,
    }),
    breakdown: PropTypes.shape({
      TRIVIA: PropTypes.number,
      DONATION: PropTypes.number,
      BONUS: PropTypes.number,
    }),
  }).isRequired,
  onPin: PropTypes.func.isRequired,
};

const HistoryScreen = () => {
  const dispatch = useDispatch();
  const { all, asHost, asPlayer, loading, error } = useSelector(
    (state) => state.history
  );
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    dispatch(fetchHistory());
  }, [dispatch]);

  const onRefresh = () => dispatch(fetchHistory());
  const onPin = (gameId) => dispatch(togglePin(gameId));

  const currentData =
    activeTab === 'all' ? all : activeTab === 'asHost' ? asHost : asPlayer;

  if (loading && currentData.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#ffa502" size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error && <Text style={styles.errorText}>{`שגיאה: ${error}`}</Text>}

      <View style={styles.tabBar}>
        {TABS.map((t) => (
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

      <FlatList
        data={currentData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <GameCard item={item} onPin={onPin} />}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor="#ffa502"
          />
        }
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>אין משחקים להצגה</Text>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#030712' },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#030712',
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#111827',
  },
  tab: { flex: 1, paddingVertical: 13, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderColor: '#ffa502' },
  tabText: { color: '#6b7280', fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: '#ffa502' },
  list: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '700' },
  pinBtn: { fontSize: 13, color: '#9ca3af' },
  gameTitle: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 4,
  },
  gameDate: {
    color: '#6b7280',
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 12,
  },
  breakdown: { backgroundColor: '#1f2937', borderRadius: 10, padding: 12 },
  breakdownTitle: {
    color: '#9ca3af',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 6,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  breakdownItem: { color: '#d1d5db', fontSize: 12 },
  totalText: {
    color: '#ffa502',
    fontWeight: '800',
    fontSize: 14,
    textAlign: 'left',
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 60,
    fontSize: 16,
  },
  errorText: {
    color: '#ff4757',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});

export default HistoryScreen;
