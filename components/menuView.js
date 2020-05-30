import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Subheading, Divider } from 'react-native-paper';
import { AntDesign } from '@expo/vector-icons';

const menuView = (props) => {
    return (
        <TouchableOpacity
            onPress={props.onPress}>
            <View style={styles.container}>
                <View style={styles.iconView}>
                    <AntDesign name={props.iconLeft} size={24} color={props.color} />
                </View>
                <View style={styles.titleView}>
                    <Subheading>{props.title}</Subheading>
                </View>
                <View style={styles.iconView}>
                    <AntDesign name={props.iconRight} size={14} />
                </View>
            </View>
            <Divider />
        </TouchableOpacity>
    )
}

const styles = StyleSheet.create({
    container: {
        paddingVertical: 14,
        flexDirection: "row",
        alignItems: "center"
    },
    titleView: {
        flex: 2,
        marginLeft: 8,
    },
    iconView: {
        flex: 0.5,
        alignItems: "center"
    }
})

export default menuView;