import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import PropTypes from 'prop-types';
import { useSelector, useDispatch } from 'react-redux';
import {
  fetchInbox,
  markAsRead,
  resetInbox,
  addNewItem,
} from '../store/slices/inboxSlice';
import { socket } from '../services/socket.service';

// ─── 1. קומפוננטים קטנים ───────────────────────────────────
const Badge = ({ label, color = '#ffa502' }) => (
  <View
    style={[
      badgeStyles.wrap,
      { backgroundColor: color + '22', borderColor: color },
    ]}
  >
    <Text style={[badgeStyles.text, { color }]}>{label}</Text>
  </View>
);

Badge.propTypes = {
  label: PropTypes.string.isRequired,
  color: PropTypes.string,
};

const Card = ({ children, style }) => (
  <View style={[cardStyles.wrap, style]}>{children}</View>
);

Card.propTypes = {
  children: PropTypes.node.isRequired,
  style: PropTypes.object,
};

const Btn = ({ label, onPress, color = '#ffa502', disabled, loading }) => (
  <TouchableOpacity
    style={[
      btnStyles.wrap,
      { backgroundColor: disabled || loading ? '#374151' : color },
    ]}
    onPress={onPress}
    disabled={disabled || loading}
    activeOpacity={0.8}
  >
    {loading ? (
      <ActivityIndicator color="#000" size="small" />
    ) : (
      <Text style={[btnStyles.text, { color: disabled ? '#6b7280' : '#000' }]}>
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

// ─── 2. הקומפוננט הראשי ───────────────────────────────────
const InboxScreen = () => {
  const dispatch = useDispatch();
  const { items, loading, hasMore, page, error } = useSelector(
    (state) => state.inbox
  );

  useEffect(() => {
    dispatch(resetInbox());
    dispatch(fetchInbox({ page: 1, limit: 10 }));

    const handleNewItem = (data) => {
      console.log('🚀 [Socket Inbox]: New Item Received', data);
      dispatch(addNewItem(data));
    };

    socket.on('new_inbox_item', handleNewItem);

    return () => {
      socket.off('new_inbox_item', handleNewItem);
    };
  }, [dispatch]);

  const loadMore = () => {
    if (hasMore && !loading) {
      dispatch(fetchInbox({ page, limit: 10 }));
    }
  };

  const onRefresh = useCallback(() => {
    dispatch(resetInbox());
    dispatch(fetchInbox({ page: 1, limit: 10 }));
  }, [dispatch]);

  const renderItem = ({ item }) => (
    <Card style={styles.cardMargin}>
      <View style={styles.itemHeader}>
        <Badge
          label={
            item.type === 'GIFT'
              ? '🎁 מתנה'
              : item.type === 'FOLLOW'
                ? '👤 עוקב'
                : '📢 מערכת'
          }
          color={item.type === 'GIFT' ? '#34d399' : '#60a5fa'}
        />
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString('he-IL', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>

      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.content}>{item.content}</Text>

      <View style={styles.actions}>
        <Btn
          label="סמן כנקרא"
          onPress={() => dispatch(markAsRead({ id: item.id, type: item.type }))}
          color="#374151"
        />
        {item.type === 'FOLLOW' && item.metadata && !item.metadata.isMutual && (
          <Btn
            label="עקוב חזרה"
            onPress={() => console.log('Follow back logic here')}
            color="#ffa502"
          />
        )}
      </View>
    </Card>
  );

  return (
    <View style={styles.container}>
      {error && (
        <Text style={styles.errorText}>שגיאה בטעינת ההודעות: {error}</Text>
      )}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => item.id.toString()}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={onRefresh}
            tintColor="#ffa502"
          />
        }
        ListFooterComponent={() =>
          loading && hasMore ? (
            <ActivityIndicator color="#ffa502" style={{ margin: 20 }} />
          ) : null
        }
        ListEmptyComponent={() =>
          !loading && (
            <Text style={styles.emptyText}>אין הודעות חדשות באינבוקס</Text>
          )
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

// ─── 3. סטיילים ──────────────────────────────────────────
const badgeStyles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

const cardStyles = StyleSheet.create({
  wrap: {
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
});

const btnStyles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
    flex: 1,
  },
  text: {
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#030712',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  cardMargin: {
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timestamp: {
    color: '#6b7280',
    fontSize: 11,
  },
  title: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
    marginBottom: 4,
  },
  content: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'right',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  emptyText: {
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  errorText: {
    color: '#ff4757',
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
  },
});

export default InboxScreen;
