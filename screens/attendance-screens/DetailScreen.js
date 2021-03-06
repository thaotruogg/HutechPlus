import React, { useState, useEffect, useRef } from "react";
import {
	StyleSheet,
	View,
	TouchableOpacity,
	Alert,
	AsyncStorage,
} from "react-native";
import { Camera } from "expo-camera";
import {
	ActivityIndicator,
	Colors,
	Button,
	Caption,
	Text,
} from "react-native-paper";
import * as Animatable from "react-native-animatable";
import { MaterialIcons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { getPreciseDistance, isPointWithinRadius } from "geolib";
import moment from "moment";
import Config from "../../config.json";
import { db } from "../../src/config/db";
import Constants from "expo-constants";

console.disableYellowBox = true;

const DetailScreen = ({ navigation, route }) => {
	const [errorMsg, setErrorMsg] = useState(null);
	const [myLocation, setMyLocation] = useState(null);
	const [checkinStatus, setCheckinStatus] = useState(false);
	const [withinClass, setWithinClass] = useState();
	const [isSuccess, setIsSuccess] = useState("");
	const [radius, setRadius] = useState(8);
	const toggleSwitch = () =>
		setCheckinStatus((previousState) => !previousState);
	// const [checkinStatus, setCheckinStatus] = useState();
	// const [isEnabled, setIsEnabled] = useState(false);

	// Tuan's home
	// 10.802919, 106.715229
	// 10.802795, 106.715138
	// fail location 10.803674, 106.688265
	// temp data, waiting for teacher's app setting
	// latitude: 10.802795,
	// 	longitude: 106.715138,
	const [teacherLocation, setTeacherLocation] = useState(null);

	const cameraRef = useRef();
	const [hasPermission, setHasPermission] = useState(null);
	const [faceID, setFaceID] = useState(null);
	const [isShot, setIsShot] = useState(false);
	const [isReconize, setIsReconize] = useState(false);
	const [faceUri, setFaceUri] = useState(null);
	const [personGroupId, setPersonGroupId] = useState("16dthje1"); // clean
	const [name, setName] = useState("");
	const [mssv, setMSSV] = useState("");

	const [state, setState] = useState({
		year: "",
		month: "",
		day: "",
		timeMoment: "",
	});
	const { year, month, day, timeMoment } = state;
	const { dataMoment } = route.params;
	const { name_class } = route.params;
	const { subjectCode } = route.params;
	const { lecturer_code } = route.params;

	const cognitiveHeaders = new Headers();
	cognitiveHeaders.append("Content-Type", "application/json");
	cognitiveHeaders.append(
		"Ocp-Apim-Subscription-Key",
		Config.COGNITIVE_SERVICES_KEY
	);

	useEffect(() => {
		_main();
	}, []);

	const wait = (timeout) => {
		return new Promise((resolve) => {
			setTimeout(resolve, timeout);
		});
	};

	const _main = async () => {
		try {
			_cutString();
			let get_mssv = await AsyncStorage.getItem("username");
			setMSSV(get_mssv);
			let { locationStatus } = await Location.requestPermissionsAsync();
			if (locationStatus !== "granted") {
				setErrorMsg("Quyền truy cập vị trí đã bị từ chối");
			}

			let location = await Location.getCurrentPositionAsync({});

			const { cameraStatus } = await Camera.requestPermissionsAsync();
			setHasPermission(cameraStatus === "granted");

			let localLocation = {
				latitude: location.coords.latitude,
				longitude: location.coords.longitude,
			};

			setMyLocation(localLocation);

			let lecturerLocation;

			db.ref("Teachers/" + lecturer_code + "/location/").once(
				"value",
				(Snapshot) => {
					if (Snapshot.exists()) {
						let latitude;
						let longitude;
						let objectCoords = Object.values(Snapshot.val())[0];
						for (
							let index = 0;
							index < Object.values(objectCoords).length;
							index++
						) {
							latitude = Object.values(objectCoords)[3];
							longitude = Object.values(objectCoords)[4];
						}
						lecturerLocation = { latitude: latitude, longitude: longitude };
						console.log("get value --> ", JSON.stringify(lecturerLocation));
						console.log(
							"location --> ",
							JSON.stringify(localLocation),
							JSON.stringify(lecturerLocation)
						);
						setWithinClass(
							isPointWithinRadius(localLocation, lecturerLocation, radius)
						);
					}
				}
			);
		} catch (error) {
			console.log("error list: ", error);
		}
	};

	const _checkLocationLecturer = async () => {};

	const _cutString = () => {
		let year_log = dataMoment;
		let month_log = dataMoment;
		let day_log = dataMoment;
		setState({
			year: year_log.substr(0, 4),
			month: month_log.substr(5, 2),
			day: day_log.substr(8, 2),
			timeMoment: moment().format("HH:mm:ss"),
		});
	};

	const _pushAttendance = () => {
		db.ref(
			"Subject/" +
				subjectCode +
				"/attendance/" +
				name_class +
				"/" +
				year +
				"/" +
				month +
				"/" +
				day +
				"/" +
				mssv +
				"/"
		)
			.update({
				dateCheckIn: dataMoment,
				timeCheckIn: timeMoment,
				valueCheckIn: true,
			})
			.then((data) => {
				console.log("dataCheckIn -> pushed");
			})
			.catch((error) => {
				console.log("error", error);
			});
	};

	const takePicture = async () => {
		const photo = await cameraRef.current.takePictureAsync({
			quality: 0.2,
			base64: true,
		});
		setFaceUri(photo.uri);
		setIsShot(true);
		const uploadResult = await uploadImage(photo.base64); // return image link
		if (!uploadResult) {
			Alert.alert("Xử lý ảnh lỗi", "Vui lòng chụp lại", [
				{
					text: "OK",
					onPress: () => {
						setIsShot(false);
					},
				},
			]);
			return;
		}
		console.log("uploadImage -> success");

		const detectResult = await detectFace(uploadResult); // return face ID
		if (!detectResult) {
			Alert.alert(
				"Điểm danh không thành công",
				"Vui lòng chụp hình chỉ chứa 1 khuôn mặt",
				[
					{
						text: "Chụp lại",
						onPress: () => {
							setIsShot(false);
						},
					},
				]
			);
			return;
		}
		console.log("detect -> success");

		const identityResult = await identify(detectResult); // return person ID
		if (!identityResult) {
			console.log("Identity fail");
			Alert.alert(
				"Không tìm thấy thông tin sinh viên",
				"Tạo thông tin sinh viên mới",
				[
					{
						text: "Hủy",
					},
					{
						text: "OK",
						onPress: () => {
							setIsReconize(true);
							setIsShot(false);
						},
					},
				]
			);
			return;
		}
		console.log("identity -> success");

		const mssvResult = await getPerson(identityResult);
		if (mssvResult) {
			if (mssvResult == mssv) {
				handleAddFace(identityResult, uploadResult);
				setIsShot(false);
				_pushAttendance();
				navigation.push("AttendanceSuccess", {
					username: [mssv],
				});
			} else {
				Alert.alert("Điểm danh không thành công", "Oops.. Ai đây??😀??", [
					{
						text: "Chụp lại",
						onPress: () => {
							setIsShot(false);
						},
					},
				]);
			}
		} else {
			Alert.alert(
				"Không thể truy vấn dữ liệu",
				"Vui lòng kiểm tra đường truyền",
				[
					{
						text: "OK",
						onPress: () => {
							setIsShot(false);
						},
					},
				]
			);
		}
	};

	// upload to imgur and get image link
	const uploadImage = async (base64) => {
		let uploadResult = false;
		const uploadHeaders = new Headers();
		// uploadHeaders.append('Content-Type', 'application/json')
		uploadHeaders.append(
			"Authorization",
			`Client-ID ${Config.IMGUR_CLIENT_ID}`
		);
		const formData = new FormData();
		formData.append("image", base64);
		formData.append("type", "base64");
		const uploadConfig = {
			method: "POST",
			headers: uploadHeaders,
			body: formData,
		};

		const uploadRequest = new Request(Config.IMGUR_URL, uploadConfig);
		await fetch(uploadRequest)
			.then((res) => {
				if (res.ok) {
					return res.json();
				} else {
					throw res;
				}
			})
			.then((resJson) => {
				try {
					uploadResult = resJson.data.link;
					console.log("uploadImage -> image link: ", resJson.data.link);
				} catch (e) {}
			});
		return uploadResult;
	};

	const createGroup = async () => {
		const createConfig = {
			method: "PUT",
			headers: cognitiveHeaders,
			body: JSON.stringify({
				name: `${personGroupId}`,
				userData: `face list reconize for ${personGroupId} class.`,
				recognitionModel: "recognition_02",
			}),
		};

		const createRequest = new Request(
			`https://${Config.RESOURCE_NAME}.cognitiveservices.azure.com/face/v1.0/persongroups/${personGroupId}`,
			createConfig
		);
		const createResponse = await fetch(createRequest);
		const createJson = await createResponse.json();
		console.log("createClass -> createJson", createJson);
	};

	const handleCreatePerson = async () => {
		const personId = await createPerson();
		if (!personId) {
			return;
		}
		await handleAddFace(personId);
		await getPerson(personId);
		setIsReconize(false);
		setName(null);
		setMSSV(null);
	};

	const createPerson = async () => {
		let createPersonStatus = null;
		console.log("createPerson -> state.name"), name;
		console.log("createPerson -> state.mssv", mssv);
		if (!name || !mssv) {
			console.log("createPerson -> missing name or mssv");
			return;
		}

		const addConfig = {
			method: "POST",
			headers: cognitiveHeaders,
			body: JSON.stringify({
				name: name,
				userData: mssv,
			}),
		};

		const addRequest = new Request(
			`https://${Config.RESOURCE_NAME}.cognitiveservices.azure.com/face/v1.0/persongroups/${personGroupId}/persons`,
			addConfig
		);
		await fetch(addRequest)
			.then((res) => {
				if (res.ok) {
					return res.json();
				} else {
					console.log("createPerson -> res", res.json());
					console.log("createPerson -> Add person fail");
				}
			})
			.then((resJson) => {
				console.log("createPerson -> resJson", resJson);
				try {
					createPersonStatus = resJson.personId;
				} catch (e) {}
				// setPersonId(createPersonStatus);
				if (createPersonStatus) {
					Alert.alert("Create person success", name);
				}
			});
		return createPersonStatus;
	};

	const handleAddFace = async (personId, faceURL) => {
		await addFace(personId, faceURL);
		await training();
		await gTrainingStatus();
	};

	const addFace = async (personId, faceURL) => {
		// let addStatus = false;
		// console.log("global -> personId", personId)
		const addConfig = {
			method: "POST",
			headers: cognitiveHeaders,
			body: JSON.stringify({
				url: faceURL,
			}),
		};

		const addRequest = new Request(
			`https://${Config.RESOURCE_NAME}.cognitiveservices.azure.com/face/v1.0/persongroups/${personGroupId}/persons/${personId}/persistedFaces?detectionModel=detection_02`,
			addConfig
		);
		await fetch(addRequest)
			.then((res) => {
				if (res.ok) {
					return res.json();
				} else {
					console.log("addFace -> res", res.json());
					console.log("addFace -> request add face fail");
				}
			})
			.then((resJson) => {
				console.log("addFace -> resJson", resJson);
				try {
					Alert.alert("Add face success", addJson.persistedFaceId);
				} catch (e) {}
			});
	};

	const training = async () => {
		const trainingConfig = {
			method: "POST",
			headers: cognitiveHeaders,
		};

		const trainingRequest = new Request(
			`https://${Config.RESOURCE_NAME}.cognitiveservices.azure.com/face/v1.0/persongroups/${personGroupId}/train`,
			trainingConfig
		);
		await fetch(trainingRequest);
		// const trainingJson = await trainingResponse.json()
		// console.log("train -> trainJson", trainingJson)
	};

	const gTrainingStatus = async () => {
		const GTrainHeaders = new Headers();
		GTrainHeaders.append("Content-Type", "application/json");
		GTrainHeaders.append(
			"Ocp-Apim-Subscription-Key",
			Config.COGNITIVE_SERVICES_KEY
		);

		const GTSConfig = {
			method: "GET",
			headers: GTrainHeaders,
		};

		const TSRequest = new Request(
			`https://${Config.RESOURCE_NAME}.cognitiveservices.azure.com/face/v1.0/persongroups/${personGroupId}/training`,
			GTSConfig
		);
		await fetch(TSRequest)
			.then((res) => {
				if (res.ok) {
					return res.json();
				} else {
					console.log("gTrainingStatus -> res", res.json());
					console.log("trainingStatus -> request get trainingStatus fail");
				}
			})
			.then((resJson) => {
				console.log("trainingStatus -> resJson", resJson);
			});
	};

	const detectFace = async (imageURL) => {
		let detectFaceID = null;
		if (!imageURL) {
			console.log("detectFace -> imageURL", imageURL);
			console.log(
				"detectFace -> face url not available, cannot not detectFace"
			);
		} else {
			const detectConfig = {
				method: "POST",
				headers: cognitiveHeaders,
				body: JSON.stringify({
					url: imageURL,
				}),
			};

			const detectRequest = new Request(
				`https://${Config.RESOURCE_NAME}.cognitiveservices.azure.com/face/v1.0/detect?returnFaceId=true&recognitionModel=recognition_02&detectionModel=detection_02`,
				detectConfig
			);
			await fetch(detectRequest)
				.then((res) => {
					if (res.ok) {
						return res.json();
					} else {
						console.log("detectFace -> res", res.json());
						console.log("detectFace -> Request detect fail");
					}
				})
				.then((resJson) => {
					console.log("detectFace -> resJson", resJson);
					try {
						detectFaceID = resJson[0].faceId;

						if (resJson.length > 1) {
							detectFaceID = null;
						}
					} catch (error) {}
				});
		}
		setFaceID(detectFaceID);
		return detectFaceID;
	};

	const identify = async (faceId) => {
		let identityPersonID = null;
		console.log("identify -> faceId", faceId);
		if (!faceId) {
			console.log("identify -> faceID not available, cannot not identify");
		} else {
			const identifyConfig = {
				method: "POST",
				headers: cognitiveHeaders,
				body: JSON.stringify({
					personGroupId: personGroupId,
					faceIds: [faceId],
					maxNumOfCandidatesReturned: 1,
					confidenceThreshold: 0.8,
				}),
			};

			const identifyRequest = new Request(
				`https://${Config.RESOURCE_NAME}.cognitiveservices.azure.com/face/v1.0/identify`,
				identifyConfig
			);
			await fetch(identifyRequest)
				.then((res) => {
					if (res.ok) {
						return res.json();
					} else {
						console.log("identify -> res", res.json());
						console.log("identify -> request identity fail");
					}
				})
				.then((resJson) => {
					console.log("identify -> resJson", resJson);
					try {
						identityPersonID = resJson[0].candidates[0].personId;
					} catch (error) {}
				});
		}
		// setPersonId(identityPersonID)
		return identityPersonID;
	};

	const getPerson = async (personId) => {
		let personName = null;
		let personMSSV = null;
		if (!personId) {
			console.log("getPerson -> personId", personId);
			console.log("getPerson -> cannot not getPerson");
		} else {
			const getPersonConfig = {
				method: "GET",
				headers: cognitiveHeaders,
			};

			const getPersonRequest = new Request(
				`https://${Config.RESOURCE_NAME}.cognitiveservices.azure.com/face/v1.0/persongroups/${personGroupId}/persons/${personId}`,
				getPersonConfig
			);
			await fetch(getPersonRequest)
				.then((res) => {
					if (res.ok) {
						return res.json();
					} else {
						console.log("getPerson -> res", res.json());
						console.log("request get person fail");
						return;
					}
				})
				.then((resJson) => {
					console.log("getPerson -> resJson", resJson);
					try {
						personName = resJson.name;
						personMSSV = resJson.userData;
					} catch (error) {}
				});
		}
		setName(personName);
		// setMSSV(personMSSV)
		return personMSSV;
	};

	return (
		<View style={styles.container}>
			{myLocation ? (
				withinClass ? (
					!isShot ? (
						<>
							<View style={styles.borderBox}>
								<Caption style={{ textAlign: "center" }}>
									Giữ gương mặt vừa trong khung
								</Caption>
								<Caption style={{ textAlign: "center", marginTop: -8 }}>
									và ấn nút chụp.
								</Caption>
							</View>
							<Camera
								ref={cameraRef}
								type={Camera.Constants.Type.front}
								ratio="4:3"
								style={styles.cmrContainer}
							></Camera>
							<View style={styles.btnContainer}>
								<TouchableOpacity onPress={takePicture}>
									<View
										style={{
											backgroundColor: "#fff",
											width: 80,
											height: 80,
											display: "flex",
											justifyContent: "center",
											alignItems: "center",
											borderRadius: 999,
										}}
									>
										<MaterialIcons name="camera-alt" size={28} color="black" />
									</View>
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => navigation.goBack()}
									style={{ marginRight: 40 }}
								>
									<View
										style={{
											backgroundColor: "#fff",
											width: 54,
											height: 54,
											display: "flex",
											justifyContent: "center",
											alignItems: "center",
											borderRadius: 999,
										}}
									>
										<MaterialIcons name="arrow-back" size={24} color="black" />
									</View>
								</TouchableOpacity>
							</View>
						</>
					) : (
						<Animatable.View animation="bounceIn" style={styles.loadContainer}>
							<ActivityIndicator
								animating={isShot}
								size="large"
								color={Colors.red800}
							/>
							<Text style={styles.textStyle}>Đang quét khuôn mặt...</Text>
							<Text style={styles.textStyle}>
								Vui lòng đợi và không tắt màn hình
							</Text>
						</Animatable.View>
					)
				) : (
					<View style={{ flex: 3 }}>
						<View
							style={{
								flex: 2 / 3,
								justifyContent: "center",
								alignItems: "center",
							}}
						>
							<Text style={{ color: "#fff", textAlign: "center" }}>
								{"Đang ở ngoài vùng phủ sóng??"}
							</Text>
							<Text style={{ color: "#fff", textAlign: "center" }}>
								{"🙂"}
							</Text>
						</View>
						<Animatable.View
							style={{
								flex: 1 / 3,
								justifyContent: "center",
								alignItems: "center",
							}}
							animation="slideInUp"
						>
							<Button
								style={{ marginBottom: 54 }}
								mode="contained"
								color="#fff"
								onPress={() => navigation.goBack()}
							>
								Quay lại
							</Button>
						</Animatable.View>
					</View>
				)
			) : (
				<View>
					{/* Chưa có location */}
					<ActivityIndicator size="large" color="#0000ff" />
					<Text style={{ marginTop: 6, color: "#fff", textAlign: "center" }}>
						Đang tải
					</Text>
				</View>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	topContainer: {
		flex: 0 / 10,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
		tintColor: "#000",
	},
	container: {
		flex: 10 / 10,
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
		paddingTop: Constants.statusBarHeight,
	},

	textStyle: {
		margin: 10,
		color: "#fff",
	},
	btnContainer: {
		flex: 3 / 10,
		display: "flex",
		flexDirection: "row-reverse",
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
		marginLeft: "26%",
	},
	loadContainer: {
		flex: 1,
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		alignItems: "center",
		backgroundColor: "#000",
	},
	button: {
		margin: 10,
	},
	nonBlurredContent: {
		alignItems: "center",
		justifyContent: "center",
	},
	cmrContainer: {
		width: "100%",
		marginTop: "18%",
		flex: 7 / 10,
		alignItems: "center",
		justifyContent: "center",
		// borderWidth: 1,
	},
	borderBox: {
		position: "absolute",
		top: "27%",
		left: "17%",
		width: 240,
		height: 300,
		borderWidth: 2,
		borderColor: "gray",
		borderRadius: 24,
		zIndex: 999,
	},
});

export default DetailScreen;
