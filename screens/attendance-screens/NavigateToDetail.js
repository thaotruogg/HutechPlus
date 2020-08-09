import React, { useState, useEffect } from "react";
import {
	StyleSheet,
	Text,
	View,
	AsyncStorage,
	ActivityIndicator,
	Image,
	ScrollView,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Button, Caption, Subheading, Paragraph } from "react-native-paper";
import HeaderComponent from "../../components/Header";

import { db } from "../../src/config/db";

const sourceCheckInFalse = "../../assets/other-icon/040-error.png";
const sourceCheckInTrue = "../../assets/other-icon/020-wifi.png";

const NavigateToDetail = ({ navigation, route }) => {
	const { subjectCode } = route.params;
	const { address } = route.params;
	const { name_lecturer } = route.params;
	const { dataMoment } = route.params;
	const [nameClass, setNameClass] = useState("");
	const [nameLecturer, setNameLecturer] = useState("");
	const [validCheckIn, setValidCheckIn] = useState();
	const [isLoad, setIsLoad] = useState(false);

	const [state, setState] = useState({
		subject_code: "",
		subject_name: "",
	});
	const { subject_code, subject_name } = state;

	useEffect(() => {
		try {
			_getAsyncCode();
			_fetchInfoSubject();
			_fetchInfoLecturer();
		} catch (error) {}
	}, [subjectCode]);

	const _getAsyncCode = async () => {
		setIsLoad(true);

		try {
			let nameClass_log = await AsyncStorage.getItem("nameClass");
			db.ref(
				"Subject/" + subjectCode + "/attendance/" + nameClass_log + "/"
			).on("value", (Snapshot) => {
				if (Snapshot.exists()) {
					const object_childCheckIn = Snapshot.child("stateCheckIn").val();
					let element;
					for (
						let index = 0;
						index < Object.values(object_childCheckIn).length;
						index++
					) {
						element = Object.values(object_childCheckIn)[2];
					}
					if (element) {
						setValidCheckIn(element);
					}
				}
			});
			setNameClass(nameClass_log);
		} catch (error) {}
	};

	const _fetchInfoSubject = () => {
		try {
			db.ref("Subject/" + subjectCode + "/").once("value", (Snapshot) => {
				if (Snapshot.exists()) {
					let object_log = Snapshot.val();
					let subjectCode_temp;
					let subjectName_temp;
					for (
						let index = 0;
						index < Object.values(object_log).length;
						index++
					) {
						subjectCode_temp = Object.values(object_log)[2];
						subjectName_temp = Object.values(object_log)[3];
					}
					if (subjectCode_temp && subjectName_temp) {
						setState({
							subject_code: subjectCode_temp,
							subject_name: subjectName_temp,
						});
					}
					setIsLoad(false);
				}
			});
		} catch (error) {}
	};

	const _fetchInfoLecturer = () => {
		db.ref("Teachers/" + name_lecturer + "/").once("value", (Snapshot) => {
			if (Snapshot.exists()) {
				let value_log = Snapshot.child("fullname").val();
				setNameLecturer(value_log);
			}
		});
	};

	return (
		<View style={styles.container}>
			<HeaderComponent title="THÔNG TIN" onPress={() => navigation.goBack()} />
			<View style={styles.content}>
				{isLoad === true ? (
					<ActivityIndicator style={{ padding: 28 }} color="#00bcd4" />
				) : (
					<>
						<View style={styles.flexRow}>
							<View style={{ marginRight: 8 }}>
								<Caption>Mã môn học</Caption>
								<Subheading style={{ fontWeight: "bold" }}>
									{subject_code}
								</Subheading>
							</View>
							<View style={{ marginLeft: 8 }}>
								<Caption>Môn học</Caption>
								<Subheading style={{ fontWeight: "bold" }}>
									{subject_name}
								</Subheading>
							</View>
						</View>
						<View style={styles.flexRow}>
							<View style={{ marginRight: 8 }}>
								<Caption>Địa điểm</Caption>
								<Paragraph>{address}</Paragraph>
							</View>
							<View style={{ marginLeft: 8 }}>
								<Caption>Ngày học</Caption>
								<Paragraph>{dataMoment}</Paragraph>
							</View>
						</View>
						<View>
							<Caption>Giảng viên giảng dạy</Caption>
							<Paragraph>{nameLecturer}</Paragraph>
						</View>
						<View style={styles.flexRow}>
							<View style={{ marginRight: 8 }}>
								<Caption>Lớp của bạn</Caption>
								<Paragraph>{nameClass}</Paragraph>
							</View>
							<View style={{ marginLeft: 8 }}>
								<Caption>Trạng thái</Caption>
								{validCheckIn === true ? (
									<Paragraph>Điểm danh đang mở.</Paragraph>
								) : (
									<Paragraph>Điểm danh đang đóng.</Paragraph>
								)}
							</View>
						</View>
					</>
				)}
			</View>
			<View style={styles.contentImage}>
				{!validCheckIn ? (
					<>
						<Image
							style={styles.imgIcon}
							source={require(sourceCheckInFalse)}
						/>
						<Paragraph>Bạn chưa thể điểm danh ngay bây giờ</Paragraph>
					</>
				) : (
					<>
						<Image style={styles.imgIcon} source={require(sourceCheckInTrue)} />
						<Paragraph>Bạn đã có thể điểm danh ngay</Paragraph>
					</>
				)}
			</View>
			<View style={styles.contentButton}>
				{!validCheckIn ? (
					<Caption style={{ textAlign: "center" }}>
						Giảng viên chưa mở điểm danh, vui lòng quay lại sau.
					</Caption>
				) : (
					<Button
						mode="contained"
						onPress={() => navigation.navigate("Detail", {dataMoment: dataMoment})}
					>
						Bắt đầu điểm danh
					</Button>
				)}
			</View>
			<StatusBar style="auto" />
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: "#fff",
	},
	content: {
		flex: 0.7,
		padding: 8,
	},
	contentButton: {
		flex: 0.3,
		padding: 8,
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
	},
	imgIcon: {
		width: 120,
		height: 120,
		marginBottom: 12,
	},
	contentImage: {
		display: "flex",
		justifyContent: "center",
		alignItems: "center",
	},
	flexRow: {
		display: "flex",
		flexDirection: "row",
	},
});

export default NavigateToDetail;
