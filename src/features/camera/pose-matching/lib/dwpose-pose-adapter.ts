import type {
  NormalizedPoseLandmark,
  NormalizedPosePerson,
  NormalizedPoseResult,
} from "@entities/feed";
import type {
  CommonJoint,
  DWPoseSourcePose,
} from "../model";

export const DWPOSE_KEYPOINT_FORMAT = "dwpose_xy_score" as const;

const DWPOSE_BODY_INDEX: Record<CommonJoint, number> = {
  NOSE: 0,
  LEFT_SHOULDER: 5,
  RIGHT_SHOULDER: 6,
  LEFT_ELBOW: 7,
  RIGHT_ELBOW: 8,
  LEFT_WRIST: 9,
  RIGHT_WRIST: 10,
  LEFT_HIP: 11,
  RIGHT_HIP: 12,
  LEFT_KNEE: 13,
  RIGHT_KNEE: 14,
  LEFT_ANKLE: 15,
  RIGHT_ANKLE: 16,
};

export class DWPoseContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DWPoseContractError";
  }
}

function assertContract(
  condition: boolean,
  message: string,
): asserts condition {
  if (!condition) {
    throw new DWPoseContractError(message);
  }
}

function isNormalizedLandmark(
  value: NormalizedPoseLandmark | NormalizedPosePerson,
): value is NormalizedPoseLandmark {
  return "index" in value && !("landmarks" in value);
}

function assertLandmark(
  landmark: NormalizedPoseLandmark,
  personIndex: number,
) {
  assertContract(
    Number.isInteger(landmark.index) && landmark.index >= 0,
    `Person ${personIndex} has an invalid landmark index.`,
  );
  assertContract(
    Number.isFinite(landmark.x) &&
      landmark.x >= 0 &&
      landmark.x <= 1 &&
      Number.isFinite(landmark.y) &&
      landmark.y >= 0 &&
      landmark.y <= 1,
    `Person ${personIndex}, landmark ${landmark.index} is outside normalized source coordinates.`,
  );
  assertContract(
    landmark.visibility === undefined ||
      (Number.isFinite(landmark.visibility) &&
        landmark.visibility >= 0 &&
        landmark.visibility <= 1),
    `Person ${personIndex}, landmark ${landmark.index} has an invalid visibility.`,
  );
}

function normalizePeople(
  result: NormalizedPoseResult,
): NormalizedPosePerson[] {
  const { analysis, landmarks } = result;

  if (analysis.storageShape === "single_person") {
    assertContract(
      landmarks.every(isNormalizedLandmark),
      "single_person storage must contain a flat landmark array.",
    );
    assertContract(
      analysis.posePersonCount === 0 ||
        analysis.posePersonCount === 1,
      "single_person storage supports zero or one person.",
    );

    return analysis.posePersonCount === 0
      ? []
      : [
          {
            personIndex: 0,
            landmarks,
          },
        ];
  }

  assertContract(
    landmarks.every((value) => !isNormalizedLandmark(value)),
    "multi_person storage must contain person objects.",
  );
  return landmarks as NormalizedPosePerson[];
}

function assertAnalysisContract(
  result: NormalizedPoseResult,
  people: readonly NormalizedPosePerson[],
) {
  const { analysis } = result;
  assertContract(
    analysis.keypointFormat === DWPOSE_KEYPOINT_FORMAT,
    `Unsupported DWPose keypoint format: ${analysis.keypointFormat}`,
  );
  assertContract(
    Number.isInteger(analysis.posePersonCount) &&
      analysis.posePersonCount >= 0 &&
      analysis.posePersonCount === people.length,
    "posePersonCount does not match stored people.",
  );
  assertContract(
    Number.isInteger(analysis.rawPersonCount) &&
      analysis.rawPersonCount >= analysis.posePersonCount,
    "rawPersonCount must be greater than or equal to posePersonCount.",
  );
  assertContract(
    analysis.poseAnalyzed || people.length === 0,
    "Unanalyzed pose result cannot contain people.",
  );
  assertContract(
    Number.isInteger(analysis.truncatedToKeypoints) &&
      analysis.truncatedToKeypoints > 0,
    "truncatedToKeypoints must be a positive integer.",
  );

  const perPersonArrays = [
    analysis.keypointCountsPerPerson,
    analysis.scoreCountsPerPerson,
    analysis.averageScorePerPerson,
  ];
  assertContract(
    perPersonArrays.every(
      (values) => values.length === people.length,
    ),
    "Per-person analysis arrays must match posePersonCount.",
  );

  const seenPersonIndices = new Set<number>();
  for (const [arrayIndex, person] of people.entries()) {
    assertContract(
      Number.isInteger(person.personIndex) &&
        person.personIndex >= 0 &&
        !seenPersonIndices.has(person.personIndex),
      `Invalid or duplicate personIndex: ${person.personIndex}`,
    );
    seenPersonIndices.add(person.personIndex);

    const rawKeypointCount =
      analysis.keypointCountsPerPerson[arrayIndex];
    assertContract(
      Number.isInteger(rawKeypointCount) &&
        rawKeypointCount >= 0 &&
        person.landmarks.length ===
          Math.min(
            rawKeypointCount,
            analysis.truncatedToKeypoints,
          ),
      `Person ${person.personIndex} keypoint count does not match truncation analysis.`,
    );
    assertContract(
      Number.isInteger(
        analysis.scoreCountsPerPerson[arrayIndex],
      ) &&
        analysis.scoreCountsPerPerson[arrayIndex] >= 0 &&
        analysis.scoreCountsPerPerson[arrayIndex] <=
          rawKeypointCount,
      `Person ${person.personIndex} has an invalid score count.`,
    );
    assertContract(
      Number.isFinite(
        analysis.averageScorePerPerson[arrayIndex],
      ) &&
        analysis.averageScorePerPerson[arrayIndex] >= 0 &&
        analysis.averageScorePerPerson[arrayIndex] <= 1,
      `Person ${person.personIndex} has an invalid average score.`,
    );

    const seenLandmarkIndices = new Set<number>();
    for (const landmark of person.landmarks) {
      assertLandmark(landmark, person.personIndex);
      assertContract(
        !seenLandmarkIndices.has(landmark.index),
        `Person ${person.personIndex} has duplicate landmark index ${landmark.index}.`,
      );
      seenLandmarkIndices.add(landmark.index);
    }
  }
}

export function normalizeDWPosePeople(
  result: NormalizedPoseResult,
): NormalizedPosePerson[] {
  const people = normalizePeople(result);
  assertAnalysisContract(result, people);
  return people;
}

export function adaptDWPosePose(
  person: NormalizedPosePerson,
): DWPoseSourcePose {
  const landmarkByIndex = new Map(
    person.landmarks.map((landmark) => [
      landmark.index,
      landmark,
    ]),
  );

  return {
    coordinateSpace: "dwpose_source_normalized",
    sourcePersonIndex: person.personIndex,
    joints: Object.fromEntries(
      Object.entries(DWPOSE_BODY_INDEX).flatMap(
        ([joint, index]) => {
          const landmark = landmarkByIndex.get(index);
          return landmark
            ? [
                [
                  joint,
                  {
                    x: landmark.x,
                    y: landmark.y,
                    confidence: landmark.visibility ?? 0,
                  },
                ],
              ]
            : [];
        },
      ),
    ),
  };
}

export function adaptDWPoseResult(
  result: NormalizedPoseResult,
): DWPoseSourcePose[] {
  return normalizeDWPosePeople(result).map(adaptDWPosePose);
}
