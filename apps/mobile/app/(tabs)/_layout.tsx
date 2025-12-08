import React from 'react';
import { DynamicColorIOS } from 'react-native';
import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabsLayout() {
  return (
    <NativeTabs
      labelStyle={{
        color: DynamicColorIOS({
          dark: 'white',
          light: 'black',
        }),
      }}
      tintColor={DynamicColorIOS({
        dark: 'white',
        light: 'black',
      })}
    >
      {/* Athlete tabs */}
      <NativeTabs.Trigger name="athlete-home">
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
        <Label>Home</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="athlete-performance">
        <Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
        <Label>Progress</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="athlete-settings">
        <Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>

      {/* Coach tabs */}
      <NativeTabs.Trigger name="coach-clients">
        <Icon sf={{ default: 'person.2', selected: 'person.2.fill' }} />
        <Label>Clients</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach-calendar">
        <Icon sf={{ default: 'calendar', selected: 'calendar' }} />
        <Label>Calendar</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach-inbox">
        <Icon sf={{ default: 'tray', selected: 'tray.fill' }} />
        <Label>Inbox</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach-settings">
        <Icon sf={{ default: 'gear', selected: 'gearshape.fill' }} />
        <Label>Settings</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}


