import React from 'react';
import { View, Text } from 'react-native';
import { useSelector } from 'react-redux';
import HostTestScreen from './host_test'; 
import PlayerTestScreen from './player_test';
import ViewerTestScreen from './viewer_test';

export default function GameScreen() {
  const { role } = useSelector(state => state.gameStream);

  console.log("Current role in GameScreen:", role);

  return (
    <View style={{ flex: 1, backgroundColor: '#1a1a1a' }}>
      {role === 'HOST' ? (
        <HostTestScreen />
      ) : role === 'PLAYER' ? (
        <PlayerTestScreen />
      ) : (
        <View style={{flex:1, justifyContent:'center', alignItems:'center'}}>
           <Text style={{color: 'white'}}>מסך צופה - פתח בדפדפן לבדיקת HLS</Text>
        </View>
      )}
    </View>
  );
}