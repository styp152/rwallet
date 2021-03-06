import React, { Component } from 'react';
import {
  StyleSheet, View, Text,
} from 'react-native';
import PropTypes from 'prop-types';
import Switch from '../switch/switch';

const styles = StyleSheet.create({
  item: {
    padding: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    flex: 1,
  },
});

export default class SwitchListItem extends Component {
  constructor(props) {
    super(props);
    const { value } = this.props;
    this.state = { value };
  }

  render() {
    const { value } = this.state;
    const { title } = this.props;
    return (
      <View style={styles.item}>
        <Text style={styles.title}>{title}</Text>
        <Switch
          value={value}
          onValueChange={(v) => {
            this.setState({ value: v });
          }}
        />
      </View>
    );
  }
}

SwitchListItem.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.bool.isRequired,
};
