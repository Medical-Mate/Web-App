# Figma ↔ 코드 컴포넌트 매핑

Figma 마스터와 코드 컴포저블의 대응이다. 이 표는 생성한 것이다.
손으로 고치지 말고 `scripts` 없이도 재생성할 수 있게 절차를 아래에 적었다.

- 파일 키: `cG6lz8nwzp75bfAXCnMqxx`
- 노드 URL 형식: `https://www.figma.com/design/cG6lz8nwzp75bfAXCnMqxx/AX-해커톤?node-id=<노드 id의 콜론을 하이픈으로>`

## Code Connect를 쓰지 못하는 이유

Figma가 이 대응을 Dev Mode에 표시해 주는 기능이 Code Connect다. 지금은 쓸 수 없다.

```
You need a Dev or Full seat on an Organization or Enterprise plan to use Code Connect.
```

`wantedlab` org에서 View 시트다. 파일 편집도 막혀 있어 컴포넌트 설명에 적는 방법도 안 된다.
Dev 또는 Full 시트가 생기면 아래 표를 그대로 Code Connect 매핑으로 옮길 수 있다.
label은 `Compose`를 쓴다.

## 구현한 컴포넌트

| Figma 마스터 | 노드 id | 코드 | 파일 |
| -- | -- | -- | -- |
| `Add Row` | `1129:9199` | `MedicalMateAddRow` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/AddRow.kt` |
| `Avatar` | `311:839` | `MedicalMateAvatar` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Avatar.kt` |
| `Badge` | `311:834` | `MedicalMateBadge` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Badge.kt` |
| `Bottom CTA Bar` | `294:652` | `MedicalMateBottomCtaBar` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/BottomCtaBar.kt` |
| `Bottom Sheet` | `294:681` | `MedicalMateBottomSheet` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/BottomSheet.kt` |
| `Bubble` | `313:999` | `MedicalMateBubble` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Bubble.kt` |
| `Button` | `291:670` | `MedicalMateButton` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Button.kt` |
| `Callout` | `293:657` | `MedicalMateCallout` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Callout.kt` |
| `Card` | `293:656` | `MedicalMateCard` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Card.kt` |
| `Card Pick` | `1129:9198` | `MedicalMateCardPick` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/CardPick.kt` |
| `Checkbox` | `311:851` | `MedicalMateCheckbox` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Selection.kt` |
| `Chip` | `311:823` | `MedicalMateChip` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Chip.kt` |
| `Date Cell` | `335:1188` | `MedicalMateDateCell` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/DateCell.kt` |
| `Dialog` | `312:845` | `MedicalMateDialog` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Dialog.kt` |
| `Divider` | `333:1088` | `MedicalMateDivider` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Rows.kt` |
| `Doctor Card` | `333:1155` | `MedicalMateDoctorCard` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/DoctorCard.kt` |
| `Empty State` | `335:1166` | `MedicalMateEmptyState` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/EmptyState.kt` |
| `Hospital Card` | `1129:9195` | `MedicalMateHospitalCard` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/HospitalCard.kt` |
| `Icon Button` | `298:715` | `MedicalMateIconButton` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/IconButton.kt` |
| `KV Row` | `333:1100` | `MedicalMateKvRow` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Rows.kt` |
| `List Row` | `335:1114` | `MedicalMateListRow` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Rows.kt` |
| `Loading` | `335:1175` | `MedicalMateLoadingSpinner` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Loading.kt` |
| `Logo Lockup` | `351:1303` | `MedicalMateLogo.Lockup` | `app/src/main/java/com/mist/medicalmate/core/designsystem/MedicalMateLogo.kt` |
| `Logo Symbol` | `351:1281` | `MedicalMateLogo.Symbol` | `app/src/main/java/com/mist/medicalmate/core/designsystem/MedicalMateLogo.kt` |
| `Nav Bar` | `298:739` | `MedicalMateNavBar` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/NavBar.kt` |
| `Notice` | `292:668` | `MedicalMateNotice` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Notice.kt` |
| `Onboarding Progress` | `1155:854` | `MedicalMateOnboardingProgress` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/OnboardingProgress.kt` |
| `Overlay Scrim` | `335:1189` | `MedicalMateOverlayScrim` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/OverlayScrim.kt` |
| `Picker Field` | `1129:9196` | `MedicalMatePickerField` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/PickerField.kt` |
| `Progress Indicator` | `334:1139` | `MedicalMateProgressIndicator` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/ProgressIndicator.kt` |
| `Radio` | `311:858` | `MedicalMateRadio` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Selection.kt` |
| `Search Field` | `590:1307` | `MedicalMateSearchField` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/SearchField.kt` |
| `Section Header` | `334:1156` | `MedicalMateSectionHeader` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Rows.kt` |
| `Segmented Control` | `334:1150` | `MedicalMateSegmentedControl` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/SegmentedControl.kt` |
| `Select Bar` | `1129:9200` | `MedicalMateSelectBar` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/SelectBar.kt` |
| `Severity Readout` | `333:1126` | `MedicalMateSeverityReadout` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/SeverityReadout.kt` |
| `Severity Select` | `295:898` | `MedicalMateSeveritySelect` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/SeverityInputs.kt` |
| `Severity Slider` | `339:1293` | `MedicalMateSeveritySlider` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/SeverityInputs.kt` |
| `Social Login Button` | `383:1302` | `MedicalMateSocialLoginButton` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/SocialLoginButton.kt` |
| `Social Login Stack` | `383:1303` | `MedicalMateSocialLoginStack` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/SocialLoginButton.kt` |
| `Source Quote` | `313:1022` | `MedicalMateSourceQuote` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/SourceQuote.kt` |
| `Tab Bar` | `319:1026` | `MedicalMateTabBar` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/TabBar.kt` |
| `Text Area` | `334:1102` | `MedicalMateTextArea` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/TextFields.kt` |
| `Text Field` | `295:692` | `MedicalMateTextField` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/TextFields.kt` |
| `Toast` | `312:844` | `MedicalMateToast` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Toast.kt` |
| `Todo Row` | `1129:9197` | `MedicalMateTodoRow` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/TodoRow.kt` |
| `Toggle` | `334:1155` | `MedicalMateToggle` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/Selection.kt` |
| `Tooltip` | `542:1295` | `MedicalMateTooltipTrigger` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/TooltipTrigger.kt` |
| `Tooltip Bubble` | `575:1287` | `MedicalMateTooltipBubble` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/TooltipBubble.kt` |
| `Voice Input` | `313:993` | `MedicalMateVoiceInput` | `app/src/main/java/com/mist/medicalmate/core/designsystem/component/VoiceInput.kt` |

## 대기 중

| Figma 마스터 | 노드 id | 상태 |
| -- | -- | -- |
| `Body Map` | `387:4164` | `intake/ui/BodyMapCanvas.kt` · `BodyMapCard.kt` |

## 표를 다시 만드는 방법

컴포넌트를 추가하거나 이름을 바꾸면 이 표도 갱신한다. 각 컴포넌트 파일 KDoc 첫 줄에
`Figma <노드 id>`를 적어 두었으므로, 코드에서 노드 id와 파일 경로를 긁어 만들 수 있다.

```bash
grep -rn 'Figma \`\?[0-9]\+:[0-9]\+' app/src/main/java/com/mist/medicalmate/core/designsystem
```
