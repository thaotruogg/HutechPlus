import React, { useState, useEffect } from "react";
import {
	View,
	StyleSheet,
	ScrollView,
	FlatList,
	AsyncStorage,
	TouchableOpacity,
	RefreshControl,
	ActivityIndicator,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import Constants from "expo-constants";
import HistoryCheck from "../../components/historyCheck";
import { Ionicons } from "@expo/vector-icons";

import { Text, Title, Caption } from "react-native-paper";
import { db } from "../../src/config/db";

const HistoryScreen = ({ navigation, route }) => {
	const { subjectCode } = route.params;
	const [data, setData] = useState();
	const [haveObj, setHaveObj] = useState();
	const [subjName, setSubjName] = useState("");
	const [refreshing, setRefreshing] = useState(false);
	const [isLoad, setIsLoad] = useState(false);

	useEffect(() => {
		_fetchObject();
		return () => {};
	}, []);

	const _fetchObject = async () => {
		try {
			setIsLoad(true);
			let username = await AsyncStorage.getItem("username");
			let class_name = await AsyncStorage.getItem("nameClass");
			db.ref("Subject/" + subjectCode + "/attendance/" + class_name + "/").once(
				"value",
				(Snapshot) => {
					if (Snapshot.exists()) {
						if (Snapshot.child("2020/08").exists()) {
							let value = Object.values(Snapshot.child("2020/08").val());
							let data_log = [];
							for (let index = 0; index < value.length; index++) {
								const element = value[index];
								if (Object.keys(element) == username) {
									data_log.push(Object.values(element));
								}
							}
							let data2 = [];

							for (let index = 0; index < data_log.length; index++) {
								const element = data_log[index];
								for (let y = 0; y < element.length; y++) {
									const element2 = element[y];
									data2.push(element2);
								}
							}
							setData(data2);
							setHaveObj(true);
							setRefreshing(false);
							setIsLoad(false);
						} else {
							setHaveObj(false);
							setRefreshing(false);
							setIsLoad(false);
						}
					} else {
						setHaveObj(false);
						setRefreshing(false);
						setIsLoad(false);
					}
				}
			);
			db.ref("Subject/" + subjectCode + "/").on("value", (Snapshot) => {
				if (Snapshot.exists()) {
					let value = Snapshot.child("subjectName").val();
					setSubjName(value);
				}
			});
		} catch (error) {}
	};

	const wait = (timeout) => {
		return new Promise((resolve) => {
			setTimeout(resolve, timeout);
		});
	};

	const _onRefresh = React.useCallback(() => {
		setRefreshing(true);
		wait(1000).then(() => _fetchObject());
	}, []);

	const _renderRow = ({ item, index }) => {
		return (
			<HistoryCheck
				times={item.dateCheckIn}
				isCheck={item.valueCheckIn}
				weeks={item.dateCheckIn}
				titleSubj={subjName}
			/>
		);
	};

	return (
		<View style={styles.container}>
			<View style={styles.contentHeader}>
				<TouchableOpacity
					style={styles.customTouch}
					onPress={() => navigation.goBack()}
				>
					<Ionicons name="md-arrow-round-back" size={26} color="#fff" />
				</TouchableOpacity>
				<Title style={{ color: "#fff", textAlign: "center" }}>
					LỊCH SỬ ĐIỂM DANH
				</Title>
				<Caption style={{ textAlign: "center", marginTop: -6 }}>
					Dưới đây là nhật kí điểm danh môn
				</Caption>
				<Caption style={{ textAlign: "center", marginTop: -6 }}>
					{subjectCode}
				</Caption>
			</View>
			{isLoad ? (
				<ActivityIndicator style={{ padding: 28 }} color="#96bb7c" />
			) : haveObj ? (
				<FlatList
					style={{ marginTop: 8 }}
					data={data}
					renderItem={_renderRow}
					keyExtractor={(i, k) => k.toString()}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={_onRefresh} />
					}
				/>
			) : (
				<Caption style={{ textAlign: "center" }}>Not found data</Caption>
			)}
			<StatusBar style="auto" />
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	contentHeader: {
		backgroundColor: "#96bb7c",
		paddingTop: Constants.statusBarHeight + 8,
		height: 110,
		borderBottomStartRadius: 32,
		borderBottomEndRadius: 32,
		display: "flex",
		justifyContent: "flex-end",
		paddingBottom: 8,
		elevation: 4,
	},
	customTouch: {
		position: "absolute",
		top: Constants.statusBarHeight,
		left: 8,
		paddingHorizontal: 16,
		paddingVertical: 12,
		borderRadius: 999,
		zIndex: 999,
	},
});

export default HistoryScreen;
